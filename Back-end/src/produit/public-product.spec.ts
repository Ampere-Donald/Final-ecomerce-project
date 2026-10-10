import { masquerCouts } from './public-product';
describe('shared public catalogue projection', () => {
  it('preserves staff stock behaviour, hides costs and uses dated public offers', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const product = { prixDetail: 1000, prixPromo: 800, finPromo: new Date('2026-10-10T13:00:00Z'),
      quantiteStock: 10, quantiteDisponibleVente: 7, quantiteReservee: 3, cmupActuel: 500 };
    expect(masquerCouts(product, now)).toEqual(expect.objectContaining({ prixPublic: 800, quantiteStock: 7 }));
    expect(masquerCouts(product, now)).not.toHaveProperty('cmupActuel');
    expect(masquerCouts(product, now)).not.toHaveProperty('quantiteReservee');
    expect(masquerCouts(product, now, false)).toEqual(expect.objectContaining({ quantiteStock: 10, quantiteReservee: 3 }));
    expect(masquerCouts(product, new Date('2026-10-10T13:00:00Z')).prixPublic).toBe(1000);
    expect(product.quantiteStock).toBe(10); expect(product.cmupActuel).toBe(500);
  });
});
