import { CommandeService } from './commande.service';

describe('Inventory catalogue publication checkout', () => {
  for (const method of ['create', 'createWithAccount'] as const) {
    it.each([null, 0])(`${method} rejects a published product with price %s without writing an order or stock`, async (price) => {
      const tx = {
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
        produit: {
          findUnique: jest.fn().mockResolvedValue({ id: 'product', nomProduit: 'Test inventaire',
            estActif: true, prixDetail: price, quantiteStock: 10 }),
          updateMany: jest.fn(),
        },
        commande: { create: jest.fn() },
        mouvementStock: { create: jest.fn() },
      };
      const db = { $transaction: (callback: any) => callback(tx) };
      const service = new CommandeService(db as any, {} as any, {} as any);
      await expect(service[method]({ lignes: [{ produitId: 'product', nomProduit: 'Test inventaire',
        quantite: 1, prixUnitaire: 0 }] } as any)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'PRICE_UNAVAILABLE' }) });
      expect(tx.commande.create).not.toHaveBeenCalled();
      expect(tx.produit.updateMany).not.toHaveBeenCalled();
      expect(tx.mouvementStock.create).not.toHaveBeenCalled();
    });
    it(`${method} keeps a zero-stock published product unavailable for purchase`, async () => {
      const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([]), produit: { findUnique: jest.fn().mockResolvedValue({ id: 'product',
        nomProduit: 'Rupture', estActif: true, prixDetail: 500, quantiteStock: 0 }) },
      commande: { create: jest.fn() } };
      const service = new CommandeService({ $transaction: (callback: any) => callback(tx) } as any,
        {} as any, {} as any);
      await expect(service[method]({ lignes: [{ produitId: 'product', nomProduit: 'Rupture',
        quantite: 1, prixUnitaire: 500 }] } as any)).rejects.toThrow('Stock insuffisant');
      expect(tx.commande.create).not.toHaveBeenCalled();
    });
  }
});
