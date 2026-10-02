import { quoteCatalogue, assertQuoteAccepted } from './catalogue-quote';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
const product = {
  id: 'p1',
  nomProduit: 'Référence catalogue',
  prixDetail: '3500',
  quantiteStock: 3,
};
const database = (value: any = product) => ({
  produit: {
    findUnique: jest.fn().mockResolvedValue(value),
    findMany: jest.fn().mockResolvedValue(value ? [value] : []),
  },
  ligneTicket: { groupBy: jest.fn().mockResolvedValue([]) },
  $queryRawUnsafe: jest.fn().mockResolvedValue([]),
});
describe('Catalogue order quote', () => {
  it('excludes active shop reservations and locks stock and price before order reads', async () => {
    const db = database();
    db.ligneTicket.groupBy.mockResolvedValue([
      { produitId: 'p1', _sum: { quantite: 2 } },
    ]);
    await expect(
      quoteCatalogue(db, [{ produitId: 'p1', quantite: 2 }], { lock: true }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'STOCK_CHANGED' }),
    });
    expect(db.$queryRawUnsafe.mock.calls).toEqual([
      [
        'SELECT pg_advisory_xact_lock(hashtext($1))::text',
        'newoteg:ticket-stock:p1',
      ],
      ['SELECT id FROM produit WHERE id = $1 FOR UPDATE', 'p1'],
    ]);
    expect(db.$queryRawUnsafe.mock.invocationCallOrder.at(-1)).toBeLessThan(
      db.produit.findUnique.mock.invocationCallOrder[0],
    );
    expect(db.ligneTicket.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ticket: { statut: 'EN_ATTENTE', expiresAt: { gt: expect.any(Date) } },
        }),
      }),
    );
    await expect(
      quoteCatalogue(db, [{ produitId: 'p1', quantite: 1 }]),
    ).resolves.toMatchObject({ montantArticles: 3500 });
  });
  it('uses the same live promotional price as the public catalogue and requires renewed acceptance after expiration', async () => {
    const p = { ...product, prixPromo: 3000, finPromo: '2099-01-01T00:00:00Z' };
    const requested = [{ produitId: 'p1', quantite: 2 }];
    const current = await quoteCatalogue(database(p), requested);
    expect(current.lignes[0].prixUnitaire).toBe(3000);
    expect(current.montantArticles).toBe(6000);
    const expired = await quoteCatalogue(
      database({ ...p, finPromo: '2000-01-01T00:00:00Z' }),
      requested,
    );
    expect(expired.montantArticles).toBe(7000);
    expect(() =>
      assertQuoteAccepted(
        { montantTotal: current.montantArticles, lignes: current.lignes },
        expired,
      ),
    ).toThrow(ConflictException);
    expect(() =>
      assertQuoteAccepted(
        { montantTotal: current.montantArticles, lignes: current.lignes },
        current,
      ),
    ).not.toThrow();
  });
  it('uses catalogue prices and names without inventing delivery fees', async () => {
    const quote = await quoteCatalogue(database(), [
      { produitId: 'p1', quantite: 2 },
    ]);
    expect(quote).toEqual({
      requestProtocol: 1,
      montantArticles: 7000,
      fraisLivraison: null,
      lignes: [
        {
          produitId: 'p1',
          nomProduit: product.nomProduit,
          quantite: 2,
          prixUnitaire: 3500,
          sousTotal: 7000,
        },
      ],
    });
    expect(() =>
      assertQuoteAccepted(
        { montantTotal: 7000, lignes: [{ prixUnitaire: 3500 }] },
        quote,
      ),
    ).not.toThrow();
    for (const dto of [
      { montantTotal: 1, lignes: [{ prixUnitaire: 3500 }] },
      { montantTotal: 7000, lignes: [{ prixUnitaire: 1 }] },
    ]) {
      try {
        assertQuoteAccepted(dto, quote);
        throw new Error('Expected rejection');
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({ code: 'PRICE_CHANGED', quote });
      }
    }
  });
  it('rejects unavailable stock, inactive references and unknown prices', async () => {
    await expect(
      quoteCatalogue(database(), [{ produitId: 'p1', quantite: 4 }]),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      quoteCatalogue(database(null), [{ produitId: 'p1', quantite: 1 }]),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      quoteCatalogue(database({ ...product, estActif: false }), [
        { produitId: 'p1', quantite: 1 },
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
    for (const prixDetail of [null, '0', '-10', 'NaN'])
      await expect(
        quoteCatalogue(database({ ...product, prixDetail }), [
          { produitId: 'p1', quantite: 1 },
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
  });
  it('rejects duplicated references, fractional and negative quantities', async () => {
    for (const quantite of [0, -1, 1.5, Infinity])
      await expect(
        quoteCatalogue(database(), [{ produitId: 'p1', quantite }]),
      ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      quoteCatalogue(database(), [
        { produitId: 'p1', quantite: 1 },
        { produitId: 'p1', quantite: 1 },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
