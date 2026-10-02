import {
  cataloguePricing,
  validateCataloguePromotion,
} from './catalogue-price';
const now = new Date('2026-10-02T10:00:00Z');
const product = {
  estActif: true,
  prixDetail: 3500,
  prixPromo: 3000,
  finPromo: '2026-10-02T11:00:00Z',
};
describe('Web catalogue price policy', () => {
  it('applies a dated lower offer and keeps the current catalogue reference separate', () => {
    expect(cataloguePricing(product, now)).toEqual({
      prixPublic: 3000,
      offre: {
        prixCatalogue: 3500,
        prixOffre: 3000,
        fin: new Date(product.finPromo).toISOString(),
      },
    });
    expect(() => validateCataloguePromotion(product)).not.toThrow();
  });
  it.each([
    { finPromo: null },
    { finPromo: 'invalid' },
    { finPromo: '2026-10-02T10:00:00Z' },
    { finPromo: '2026-10-01T10:00:00Z' },
    { prixPromo: null },
    { prixPromo: 0 },
    { prixPromo: -1 },
    { prixPromo: 3500 },
    { prixPromo: 4000 },
    { prixPromo: true },
    { prixPromo: Infinity },
    { estActif: false },
  ])('does not advertise an unusable or expired promotion %j', (change) => {
    expect(cataloguePricing({ ...product, ...change }, now)).toEqual({
      prixPublic: 3500,
      offre: null,
    });
  });
  it.each([null, '', true, 0, -1, NaN, Infinity, 1e20])(
    'never replaces an unknown base price with a promotional amount %j',
    (prixDetail) => {
      expect(cataloguePricing({ ...product, prixDetail }, now)).toEqual({
        prixPublic: null,
        offre: null,
      });
    },
  );
  it('rounds to existing monetary precision and rejects missing/incoherent offer configuration', () => {
    expect(cataloguePricing({ prixDetail: '3500.125' }, now).prixPublic).toBe(
      3500.13,
    );
    for (const change of [
      { finPromo: null },
      { prixDetail: null },
      { prixPromo: -1 },
      { prixPromo: 3500 },
    ])
      expect(() =>
        validateCataloguePromotion({ ...product, ...change }),
      ).toThrow();
    expect(() => validateCataloguePromotion({ prixPromo: null })).not.toThrow();
    expect(() => validateCataloguePromotion({ prixPromo: 0 })).not.toThrow();
    expect(() =>
      validateCataloguePromotion({
        ...product,
        finPromo: '2025-01-01T00:00:00Z',
      }),
    ).not.toThrow();
  });
});
