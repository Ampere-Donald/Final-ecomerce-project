import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DevisService } from './devis.service';
const actor = { id: 'seller', role: 'VENDEUR' };
function harness() {
  const row: any = {
    id: 'request',
    clientId: 'client',
    nomClient: 'Client',
    responsableId: 'seller',
    version: 2,
    statut: 'RECUE',
    lignes: [{ produitId: 'product', quantite: 3 }],
  };
  const tx: any = {
    $queryRaw: jest.fn(),
    demandeDevis: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(row),
    },
    demandeDevisEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    produit: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'product', prixDetail: 250 }]),
    },
    proforma: { findUnique: jest.fn() },
  };
  const db: any = {
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
  };
  const proformas: any = {
    create: jest.fn().mockResolvedValue({ id: 'quote', numero: 'FP-1' }),
  };
  return { row, tx, db, proformas, service: new DevisService(db, proformas) };
}
describe('Préparation durable de proforma', () => {
  it('lie le compte serveur, le prix catalogue et l’historique dans la même transaction', async () => {
    const h = harness();
    const result = await h.service.prepare(actor, 'request', { version: 2 });
    expect(result.reprise).toBe(false);
    expect(h.proformas.create).toHaveBeenCalledWith(
      'seller',
      expect.objectContaining({
        clientId: 'client',
        lignes: [{ produitId: 'product', quantite: 3, prixUnitaire: 250 }],
      }),
      h.tx,
    );
    expect(h.tx.demandeDevisEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: {
            action: 'PROFORMA_PREPAREE',
            preparationVersion: 2,
            proformaId: 'quote',
          },
        }),
      }),
    );
  });
  it('retrouve la création après une réponse perdue sans recréer', async () => {
    const h = harness();
    h.tx.demandeDevisEvent.findFirst.mockResolvedValue({
      details: { proformaId: 'quote' },
    });
    h.tx.proforma.findUnique.mockResolvedValue({
      id: 'quote',
      clientId: 'client',
      vendeurId: 'seller',
      statut: 'EN_COURS',
      dateExpiration: new Date(Date.now() + 60000),
    });
    expect(
      (await h.service.prepare(actor, 'request', { version: 2 })).reprise,
    ).toBe(true);
    expect(h.proformas.create).not.toHaveBeenCalled();
  });
  it('bloque une création supprimée plutôt que dupliquer', async () => {
    const h = harness();
    h.tx.demandeDevisEvent.findFirst.mockResolvedValue({
      details: { proformaId: 'deleted' },
    });
    await expect(
      h.service.prepare(actor, 'request', { version: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(h.proformas.create).not.toHaveBeenCalled();
  });
  it.each(['unknown', 'duplicate', 'price'])(
    'ne transforme pas une liste invalide (%s)',
    async (kind) => {
      const h = harness();
      if (kind === 'unknown') h.row.lignes[0].produitId = null;
      if (kind === 'duplicate') h.row.lignes.push({ ...h.row.lignes[0] });
      if (kind === 'price')
        h.tx.produit.findMany.mockResolvedValue([
          { id: 'product', prixDetail: null },
        ]);
      await expect(
        h.service.prepare(actor, 'request', { version: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(h.proformas.create).not.toHaveBeenCalled();
    },
  );
  it('exige le responsable courant même pour un administrateur', async () => {
    const h = harness();
    await expect(
      h.service.prepare({ id: 'other', role: 'ADMIN' }, 'request', {
        version: 2,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('bloque une version obsolète ou une offre publiée', async () => {
    const h = harness();
    await expect(
      h.service.prepare(actor, 'request', { version: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    h.row.statut = 'ENVOYEE';
    await expect(
      h.service.prepare(actor, 'request', { version: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it.each([
    { code: 'P2034' },
    {
      code: 'P2010',
      meta: { driverAdapterError: { cause: { originalCode: '40001' } } },
    },
  ])(
    'signale le conflit de transaction comme reprenable (%j)',
    async (error) => {
      const h = harness();
      h.db.$transaction.mockRejectedValue(error);
      await expect(
        h.service.prepare(actor, 'request', { version: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );
});
