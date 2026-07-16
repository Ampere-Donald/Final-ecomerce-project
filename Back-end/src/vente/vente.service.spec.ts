import { VenteService } from './vente.service';

describe('VenteService idempotency', () => {
  it('retourne la vente existante sans retoucher stock ni caisse', async () => {
    const existing = { id: 'vente-1', idempotencyKey: '0f7f6a40-9151-4cf7-9f2d-cb2fc47b10d0' };
    const db: any = {
      vente: { findUnique: jest.fn().mockResolvedValue(existing) },
      $transaction: jest.fn(),
    };
    const service = new VenteService(db, { create: jest.fn() } as any, {} as any);

    const result = await service.create({
      idempotencyKey: existing.idempotencyKey,
      montantTotal: 1000,
      methodePaiement: 'ESPECES',
      lignesVente: [{ produitId: '0f7f6a40-9151-4cf7-9f2d-cb2fc47b10d1', quantite: 1, prixUnitaire: 1000 }],
    });

    expect(result).toBe(existing);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('VenteService remboursement', () => {
  const actor = { id: 'admin-1', nom: 'Super Admin', role: 'SUPER_ADMIN' };
  const vente = {
    id: 'vente-1',
    montantTotal: 2500,
    annulee: false,
    remboursee: false,
    lignesVente: [{ produitId: 'produit-1', quantite: 2 }],
  };

  const build = (claimedCount = 1) => {
    const tx: any = {
      vente: {
        updateMany: jest.fn().mockResolvedValue({ count: claimedCount }),
        findUnique: jest.fn().mockResolvedValue({ ...vente, remboursee: true }),
      },
      produit: { update: jest.fn().mockResolvedValue({}) },
      mouvementStock: { create: jest.fn().mockResolvedValue({}) },
      caisse: { create: jest.fn().mockResolvedValue({}) },
    };
    const db: any = {
      vente: { findUnique: jest.fn().mockResolvedValue(vente) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const notifications = { create: jest.fn().mockResolvedValue(undefined) };
    return { service: new VenteService(db, notifications as any, {} as any), tx };
  };

  it('crée une sortie de caisse et un retour de stock distincts de l’annulation', async () => {
    const { service, tx } = build();
    await service.refund('vente-1', actor, 'Retour client');

    expect(tx.vente.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'vente-1', annulee: false, remboursee: false },
      data: expect.objectContaining({ remboursee: true, motifRemboursement: 'Retour client' }),
    }));
    expect(tx.mouvementStock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ typeMouvement: 'RETOUR', quantite: 2 }),
    });
    expect(tx.caisse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ typeOperation: 'SORTIE', montant: 2500 }),
    });
  });

  it('empêche deux remboursements concurrents de restituer deux fois le stock', async () => {
    const { service, tx } = build(0);
    await expect(service.refund('vente-1', actor, 'Retour client')).rejects.toThrow('deja ete traitee');
    expect(tx.produit.update).not.toHaveBeenCalled();
    expect(tx.caisse.create).not.toHaveBeenCalled();
  });
});
