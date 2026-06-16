import { bornesPrix, classerBande, exigeMotif } from './pricing.util';

// Produit de référence : gros=1000, demi-gros=1200, détail=1500, cmup=900
const P = { prixGros: 1000, prixDemiGros: 1200, prixDetail: 1500, cmupActuel: 900 };

describe('bornesPrix()', () => {
  it('VENDEUR : plancher = demi-gros, pas de plafond', () => {
    expect(bornesPrix(P, 'VENDEUR')).toEqual({ min: 1200, max: null });
  });

  it('ADMIN non autorisé : plancher = demi-gros', () => {
    expect(bornesPrix(P, 'ADMIN', false)).toEqual({ min: 1200, max: null });
  });

  it('ADMIN autorisé : plancher = gros + 1 (jamais le gros)', () => {
    expect(bornesPrix(P, 'ADMIN', true)).toEqual({ min: 1001, max: null });
  });

  it('SUPER_ADMIN : aucune limite (peut vendre à perte)', () => {
    expect(bornesPrix(P, 'SUPER_ADMIN', false)).toEqual({ min: 0, max: null });
  });

  it('CAISSIER : traité comme bande verte (plancher demi-gros)', () => {
    expect(bornesPrix(P, 'CAISSIER')).toEqual({ min: 1200, max: null });
  });

  it('Fallback : demi-gros manquant → plancher = gros', () => {
    expect(bornesPrix({ prixGros: 1000, prixDetail: 1500 }, 'VENDEUR')).toEqual({
      min: 1000,
      max: null,
    });
  });
});

describe('classerBande()', () => {
  it('PLEIN : prix >= détail', () => {
    expect(classerBande(1500, P)).toBe('PLEIN');
    expect(classerBande(2000, P)).toBe('PLEIN');
  });

  it('VERTE : [demi-gros, détail[', () => {
    expect(classerBande(1200, P)).toBe('VERTE');
    expect(classerBande(1499, P)).toBe('VERTE');
  });

  it('JAUNE : ]gros, demi-gros[', () => {
    expect(classerBande(1100, P)).toBe('JAUNE');
    expect(classerBande(1001, P)).toBe('JAUNE');
  });

  it('ROUGE : <= gros mais >= cmup', () => {
    expect(classerBande(1000, P)).toBe('ROUGE');
    expect(classerBande(950, P)).toBe('ROUGE');
  });

  it('PERTE : sous le CMUP', () => {
    expect(classerBande(899, P)).toBe('PERTE');
    expect(classerBande(500, P)).toBe('PERTE');
  });
});

describe('exigeMotif()', () => {
  it('motif requis sous le détail', () => {
    expect(exigeMotif(1499, P)).toBe(true);
    expect(exigeMotif(1000, P)).toBe(true);
  });

  it('pas de motif au détail ou au-dessus', () => {
    expect(exigeMotif(1500, P)).toBe(false);
    expect(exigeMotif(2000, P)).toBe(false);
  });
});
