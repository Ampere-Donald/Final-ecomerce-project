import { EquivalenceService } from './equivalence.service';

describe('Equivalence public catalogue consistency', () => {
  afterEach(() => jest.useRealTimers());
  function setup() {
    const product = {
      id: 'fixture',
      nomProduit: 'Diode 1N4007',
      designationEn: 'Test diode 1N4007',
      quantiteStock: 4,
      prixDetail: 1000,
      prixPromo: 750,
      finPromo: new Date('2030-01-01T00:00:00Z'),
      categorie: { nom: 'Composants Électroniques' },
      estActif: true,
    };
    let available = 2;
    const tx = {
      $queryRaw: jest.fn(async () => [
        {
          total: available ? 1n : 0n,
          rows: available ? [{ id: product.id, available }] : [],
        },
      ]),
      produit: { findMany: jest.fn(async () => [product]) },
    };
    const db = {
      produit: { findMany: jest.fn(async () => [product]) },
      $transaction: jest.fn(async (callback) => callback(tx)),
      suggestionEquivalence: { create: jest.fn().mockResolvedValue({}) },
    };
    const gemini = {
      generateJson: jest
        .fn()
        .mockRejectedValue(new Error('No provider in test')),
    };
    return {
      product,
      db,
      gemini,
      service: new EquivalenceService(db as any, gemini as any),
      reserveAll: () => {
        available = 0;
      },
    };
  }

  it('publishes the active offer and only the stock available for sale', async () => {
    const { service, db } = setup();
    const result = await service.suggest({
      query: 'diode 1N4007',
      source: 'ecommerce',
    });
    expect(result.suggestions[0]).toMatchObject({
      quantiteStock: 2,
      prixPublic: 750,
      offre: { prixCatalogue: 1000, prixOffre: 750 },
      designationEn: 'Test diode 1N4007',
      compatibilite: 'inconnue',
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });

  it('invalidates a cached offer when it expires and removes fully reserved candidates', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2029-12-31T23:59:59Z'));
    const { service, reserveAll } = setup();
    const first = await service.suggest({ query: 'diode 1N4007' });
    expect(first.suggestions[0].prixPublic).toBe(750);
    jest.advanceTimersByTime(2000);
    const expired = await service.suggest({ query: 'diode 1N4007' });
    expect(expired.suggestions[0]).toMatchObject({
      prixPublic: 1000,
      offre: null,
    });
    reserveAll();
    expect(
      (await service.suggest({ query: 'diode 1N4007' })).suggestions,
    ).toEqual([]);
  });

  it('uses the same projection for provider results and excludes reserved IDs from its prompt', async () => {
    const { service, gemini, reserveAll } = setup();
    gemini.generateJson
      .mockReset()
      .mockResolvedValue({
        suggestions: [
          {
            produitId: 'fixture',
            raison: 'Fixture reason',
            compatibilite: 'faible',
          },
        ],
      });
    const result = await service.suggest({ query: 'diode 1N4007' });
    expect(result.suggestions[0]).toMatchObject({
      prixPublic: 750,
      quantiteStock: 2,
      compatibilite: 'faible',
    });
    expect(gemini.generateJson.mock.calls[0][0]).toContain('stock:2');
    reserveAll();
    expect(
      (await service.suggest({ query: 'diode 1N4007' })).suggestions,
    ).toEqual([]);
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
  });
});
