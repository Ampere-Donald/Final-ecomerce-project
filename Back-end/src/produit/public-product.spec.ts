import { masquerCouts } from './public-product';
describe('shared public catalogue projection', () => {
  it('publishes only the current structured version and never internal metadata', () => {
    const { fingerprint } = require('../../scripts/documentary/content.cjs');
    const product = { id:'p',nomProduit:'Article',description:'Texte existant',marque:'Marque' };
    const content = {schemaVersion:1,family:'passifs',locales:{fr:{summary:'Résumé',paragraphs:['Fonction du composant.'],applications:[],integration:[],replacement:[],missing:[],faq:[],documents:[]}},productFingerprint:fingerprint(product),privateDraft:'secret',reviewerId:'private'};
    const result=masquerCouts({...product,documentaryPublished:content});
    expect(result.documentationProduit.locales.fr.summary).toBe('Résumé');
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('reviewerId');
    expect(result).not.toHaveProperty('documentaryPublished');
    expect(masquerCouts({...product,description:'Changement ultérieur',documentaryPublished:content}).documentationProduit).toBeNull();
  });
  it('keeps documentary drafts and revision history out of public responses', () => {
    const p = { nomProduit: 'Public title', description: 'Public text', documentary: { proposal: { privateDraft: 'Draft' } }, documentaryEvents: [{ actorId: 'internal' }] };
    const result = masquerCouts(p);
    expect(result).not.toHaveProperty('documentary');
    expect(result).not.toHaveProperty('documentaryEvents');
    expect(result.description).toBe('Public text');
    expect(masquerCouts(p, new Date(), false)).toHaveProperty('documentary');
    expect(p).toHaveProperty('documentary');
  });
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
