import { EquivalenceService } from './equivalence.service';
import {
  EQUIVALENCE_INELIGIBLE_MESSAGE,
  isProductEligibleForEquivalence,
  looksLikeElectronicComponentQuery,
} from './equivalence-eligibility';

describe('EquivalenceService eligibility', () => {
  it('autorise uniquement la categorie Composants Electroniques', () => {
    expect(
      isProductEligibleForEquivalence({
        categorie: { nom: 'Composants Électroniques' },
      }),
    ).toBe(true);
    expect(
      isProductEligibleForEquivalence({
        categorie: { nom: 'Accessoires électriques' },
      }),
    ).toBe(false);
  });

  it('reconnait les recherches de composants courants', () => {
    expect(looksLikeElectronicComponentQuery('diode 1N4007')).toBe(true);
    expect(looksLikeElectronicComponentQuery('transistor 2N2222')).toBe(true);
    expect(looksLikeElectronicComponentQuery('ATTACHE EN BOITE GRIS 06MM')).toBe(false);
  });

  it('refuse un produit non composant sans appeler Gemini', async () => {
    const db = {
      produit: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          nomProduit: 'ATTACHE EN BOITE GRIS 06MM',
          categorieId: 'cat-accessoires',
          categorie: { nom: 'Accessoires électriques' },
        }),
      },
    };
    const gemini = { generateJson: jest.fn() };
    const service = new EquivalenceService(db as any, gemini as any);

    const result = await service.suggest({ produitId: 'p1', source: 'pos' } as any);

    expect(result).toEqual({
      query: '',
      suggestions: [],
      message: EQUIVALENCE_INELIGIBLE_MESSAGE,
    });
    expect(gemini.generateJson).not.toHaveBeenCalled();
  });
});
