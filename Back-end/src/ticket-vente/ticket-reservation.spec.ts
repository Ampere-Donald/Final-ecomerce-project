import { TicketVenteService } from './ticket-vente.service';
describe('Shop reservation claims current product rows', () => {
  function fixture() {
    const product = {
      id: 'part',
      nomProduit: 'Cable',
      prixDetail: 3500,
      prixGros: 800,
      prixDemiGros: 1000,
      quantiteStock: 10,
    };
    const tx = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      produit: {
        findMany: jest.fn().mockResolvedValue([product]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      ligneTicket: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ produitId: 'part', _sum: { quantite: 2 } }]),
      },
      ticketVente: {
        create: jest
          .fn()
          .mockResolvedValue({ numeroTicket: 'TEST', montantTotal: 21000 }),
      },
    };
    const db = {
      produit: { findMany: jest.fn().mockResolvedValue([product]) },
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({ role: 'SUPER_ADMIN' }),
      },
      $transaction: jest.fn((cb) => cb(tx)),
    };
    const service = new TicketVenteService(
      db as any,
      { create: jest.fn().mockResolvedValue({}) } as any,
      {} as any,
      { nextDaily: jest.fn().mockResolvedValue('TEST') } as any,
    );
    return { tx, service };
  }
  it('claims a version with sufficient physical stock for reservations plus the requested quantity, without a stock decrement', async () => {
    const { tx, service } = fixture();
    await service.create('seller', {
      lignes: [{ produitId: 'part', quantite: 6, prixUnitaire: 3500 }],
    });
    expect(tx.produit.updateMany).toHaveBeenCalledWith({
      where: { id: 'part', estActif: true, quantiteStock: { gte: 8 } },
      data: { version: { increment: 1 } },
    });
    expect(tx.produit.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.ticketVente.create.mock.invocationCallOrder[0],
    );
  });
  it('does not create a ticket when product claim loses to a concurrent stock change', async () => {
    const { tx, service } = fixture();
    tx.produit.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.create('seller', {
        lignes: [{ produitId: 'part', quantite: 6, prixUnitaire: 3500 }],
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'STOCK_CHANGED' }),
    });
    expect(tx.ticketVente.create).not.toHaveBeenCalled();
  });
});
