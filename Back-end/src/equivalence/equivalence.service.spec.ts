import { EquivalenceService } from './equivalence.service';
import {
  EQUIVALENCE_INELIGIBLE_MESSAGE,
  isProductEligibleForEquivalence,
  looksLikeElectronicComponentQuery,
} from './equivalence-eligibility';

describe('EquivalenceService eligibility', () => {
  it('retrouve BC 547 et BC 548 pour une recherche BC547 sans prendre 300 composants arbitraires', async () => {
    const products = ['BC 547', 'BC 548'].map((nomProduit, i) => ({
      id: `bc-${i}`,
      nomProduit,
      quantiteStock: 2,
      categorie: { nom: 'Composants Électroniques' },
    }));
    const db = {
      produit: { findMany: jest.fn().mockResolvedValue(products) },
      suggestionEquivalence: { create: jest.fn().mockResolvedValue({}) },
    };
    const gemini = {
      generateJson: jest.fn().mockResolvedValue({ suggestions: [] }),
    };
    await new EquivalenceService(db as any, gemini as any).suggest({
      query: 'transistor BC547',
    });
    const filters = db.produit.findMany.mock.calls[0][0].where.OR;
    expect(filters).toContainEqual({
      nomProduit: { contains: 'bc 547', mode: 'insensitive' },
    });
    expect(filters).toContainEqual({
      nomProduit: { contains: 'bc', mode: 'insensitive' },
    });
    expect(gemini.generateJson.mock.calls[0][0]).toContain('BC 548');
    expect(db.produit.findMany).toHaveBeenCalledTimes(1);
  });

  it('exclut la pièce d’origine en amont de la présélection depuis une fiche', async () => {
    const db = {
      produit: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'original',
            nomProduit: 'BC 547',
            categorie: { nom: 'Composants Électroniques' },
          }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new EquivalenceService(
      db as any,
      { generateJson: jest.fn() } as any,
    );
    await service.suggest({ produitId: 'original' });
    for (const [args] of db.produit.findMany.mock.calls)
      expect(args.where.id).toEqual({ not: 'original' });
  });
  it('recherche une autre référence en stock quand le marquage exact est absent', async () => {
    const replacement = {
      id: 'p2',
      nomProduit: 'Autre composant de test',
      quantiteStock: 4,
      prixDetail: 1500,
      categorie: { nom: 'Composants Électroniques' },
    };
    const db = {
      produit: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            replacement,
            { ...replacement, id: 'inactive', estActif: false },
          ]),
      },
      suggestionEquivalence: { create: jest.fn().mockResolvedValue({}) },
    };
    const gemini = {
      generateJson: jest.fn().mockResolvedValue({
        suggestions: [
          {
            produitId: 'p2',
            raison: 'Raison de test',
            compatibilite: 'moyenne',
          },
          { produitId: 'invented', raison: 'Invalid' },
        ],
      }),
    };
    const service = new EquivalenceService(db as any, gemini as any);
    const result = await service.suggest({
      query: 'BC547',
      source: 'ecommerce',
    });
    expect(db.produit.findMany).toHaveBeenCalledTimes(2);
    expect(db.produit.findMany.mock.calls[1][0].where).toEqual({
      estActif: true,
      quantiteStock: { gt: 0 },
      categorie: {
        is: {
          nom: { equals: 'Composants Électroniques', mode: 'insensitive' },
        },
      },
    });
    expect(gemini.generateJson.mock.calls[0][0]).toContain('id:p2');
    expect(gemini.generateJson.mock.calls[0][0]).not.toContain('id:inactive');
    expect(result.suggestions.map((s) => s.produitId)).toEqual(['p2']);
  });

  it('ne transforme pas une recherche non électronique en suggestions de composants', async () => {
    const db = { produit: { findMany: jest.fn().mockResolvedValue([]) } };
    const gemini = { generateJson: jest.fn() };
    const service = new EquivalenceService(db as any, gemini as any);
    expect(
      (
        await service.suggest({
          query: 'chaise de bureau',
          source: 'ecommerce',
        })
      ).suggestions,
    ).toEqual([]);
    expect(db.produit.findMany).toHaveBeenCalledTimes(1);
    expect(gemini.generateJson).not.toHaveBeenCalled();
  });

  it('ne force pas de substitution si le moteur ne trouve pas d’équivalent', async () => {
    const db = {
      produit: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              id: 'p2',
              nomProduit: 'Composant QA',
              quantiteStock: 3,
              categorie: { nom: 'Composants Électroniques' },
            },
          ]),
      },
      suggestionEquivalence: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new EquivalenceService(
      db as any,
      { generateJson: jest.fn().mockResolvedValue({ suggestions: [] }) } as any,
    );
    expect(
      (await service.suggest({ query: 'BC547', source: 'ecommerce' }))
        .suggestions,
    ).toEqual([]);
  });
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
    expect(
      looksLikeElectronicComponentQuery('ATTACHE EN BOITE GRIS 06MM'),
    ).toBe(false);
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

    const result = await service.suggest({
      produitId: 'p1',
      source: 'pos',
    } as any);

    expect(result).toEqual({
      query: '',
      mode: 'none',
      suggestions: [],
      message: EQUIVALENCE_INELIGIBLE_MESSAGE,
    });
    expect(gemini.generateJson).not.toHaveBeenCalled();
  });
});

describe('EquivalenceService provider recovery', () => {
  it('classe le marquage exact avant de simples valeurs communes dans le secours catalogue', async () => {
    const db = {
      produit: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'bridge',
            nomProduit: 'Pont de diode 1000 V',
            quantiteStock: 20,
            categorie: { nom: 'Composants Électroniques' },
          },
          {
            id: 'diode',
            nomProduit: 'Diode 1N4007',
            quantiteStock: 2,
            categorie: { nom: 'Composants Électroniques' },
          },
        ]),
      },
      suggestionEquivalence: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new EquivalenceService(
      db as any,
      {
        generateJson: jest.fn().mockRejectedValue(new Error('offline')),
      } as any,
    );
    const result = await service.suggest({
      query: 'diode 1N4007 redressement 1 A 1000 V',
    });
    expect(result.mode).toBe('catalogue');
    expect(result.suggestions[0].produitId).toBe('diode');
    expect(result.suggestions[0].compatibilite).toBe('inconnue');
  });
  const product = {
    id: 'p2',
    nomProduit: 'Diode de test',
    quantiteStock: 3,
    prixDetail: 100,
    categorie: { nom: 'Composants Électroniques' },
  };
  function setup(generateJson: any) {
    const db = {
      produit: { findMany: jest.fn().mockResolvedValue([product]) },
      suggestionEquivalence: { create: jest.fn().mockResolvedValue({}) },
    };
    return new EquivalenceService(db as any, { generateJson } as any);
  }
  afterEach(() => jest.restoreAllMocks());
  it('réessaie le fournisseur après 30 secondes de secours, sans conserver la panne 24 h', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const generate = jest
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 503'))
      .mockResolvedValue({
        suggestions: [
          { produitId: 'p2', raison: 'À examiner', compatibilite: 'faible' },
        ],
      });
    const service = setup(generate);
    const fallback = await service.suggest({ query: 'diode' });
    expect(fallback.mode).toBe('catalogue');
    expect(fallback.suggestions[0].compatibilite).toBe('inconnue');
    clock.mockReturnValue(30999);
    expect((await service.suggest({ query: 'diode' })).mode).toBe('catalogue');
    expect(generate).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(31000);
    expect((await service.suggest({ query: 'diode' })).mode).toBe('ai');
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it('utilise un secours explicite si la réponse JSON ne contient pas une liste', async () => {
    const service = setup(
      jest.fn().mockResolvedValue({ suggestions: { unexpected: true } }),
    );
    expect((await service.suggest({ query: 'diode' })).mode).toBe('catalogue');
  });
  it('écarte les doublons, références inventées et explications invalides', async () => {
    const s = {
      produitId: 'p2',
      raison: 'À examiner',
      compatibilite: 'faible',
    };
    const service = setup(
      jest.fn().mockResolvedValue({
        suggestions: [
          null,
          { ...s, raison: {} },
          { ...s, produitId: 'invented' },
          { ...s, compatibilite: '100%' },
          s,
          s,
        ],
      }),
    );
    const result = await service.suggest({ query: 'diode' });
    expect(result.mode).toBe('ai');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].produitId).toBe('p2');
  });
});
