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
  produit: { findUnique: jest.fn().mockResolvedValue(value) },
});
describe('Catalogue order quote', () => {
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
