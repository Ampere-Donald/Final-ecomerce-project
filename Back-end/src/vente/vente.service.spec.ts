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
