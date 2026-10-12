import { EquivalenceService } from './equivalence.service';
import { reviewedTechnicalContext } from './technical-context';

const evidence = () => ({
  etat: 'DOCUMENTE',
  valeurVersion: 4,
  attributVersion: 3,
  produitVersion: 2,
  reluParId: 'PRIVATE_REVIEWER',
  reluLe: new Date('2026-10-12T12:00:00Z'),
  sourceDocument: 'Fixture manufacturer',
  sourceUrl: 'https://manufacturer.example/fixture.pdf',
  sourceRepere: 'Table 2',
  conditions: 'Fixture only',
  motif: 'Test only',
});
const product = () => ({
  id: 'fixture',
  nomProduit: 'Transistor de recette',
  version: 2,
  categorie: { nom: 'Composants Électroniques' },
  quantiteStock: 2,
  quantiteDisponibleVente: 2,
  prixDetail: 1000,
  code: 'DEMO',
  cmupActuel: 555,
  attributs: [
    {
      id: 'a',
      version: 3,
      nomAttribut: 'Référence fabricant',
      cleTechnique: 'REFERENCE_FABRICANT',
      valeurs: [
        { id: 'v', version: 4, valeur: 'BC547P', documentation: evidence() },
      ],
    },
  ],
});
function setup() {
  const p = product();
  const tx = {
    $queryRaw: jest.fn(() =>
      Promise.resolve([{ total: 1n, rows: [{ id: p.id, available: 2 }] }]),
    ),
    produit: { findMany: jest.fn(() => Promise.resolve([p])) },
  };
  const db: any = {
    $queryRaw: jest.fn(() => Promise.resolve([{ id: p.id }])),
    $transaction: jest.fn((fn) => fn(tx)),
    produit: {
      findMany: jest.fn(() => Promise.resolve([p])),
      findUnique: jest.fn(() => Promise.resolve({ ...p, id: 'target' })),
    },
    suggestionEquivalence: { create: jest.fn().mockResolvedValue({}) },
  };
  const gemini = {
    generateJson: jest.fn<Promise<any>, [string, any]>().mockResolvedValue({
      suggestions: [
        {
          produitId: p.id,
          raison: 'Fixture only',
          compatibilite: 'haute',
          sourceUrl: 'https://invented.example/',
        },
      ],
    }),
  };
  return { p, db, gemini, service: new EquivalenceService(db, gemini as any) };
}
describe('Equivalence sources and application context', () => {
  it.each(['A_VERIFIER', 'INCONNU', 'CONTRADICTOIRE', 'NON_APPLICABLE'])(
    'does not turn %s into provider evidence',
    (etat) => {
      const p = product();
      p.attributs[0].valeurs[0].documentation.etat = etat;
      expect(reviewedTechnicalContext(p)).toEqual([]);
    },
  );
  it('hides stale or unstamped proof and private fields, including zero as a valid reviewed value', () => {
    const p = product();
    p.attributs[0].valeurs[0].valeur = '0';
    expect(reviewedTechnicalContext(p)[0].valeur).toBe('0');
    expect(JSON.stringify(reviewedTechnicalContext(p))).not.toContain(
      'PRIVATE_REVIEWER',
    );
    p.version++;
    expect(reviewedTechnicalContext(p)).toEqual([]);
    p.version--;
    p.attributs[0].valeurs[0].documentation.reluParId = '';
    expect(reviewedTechnicalContext(p)).toEqual([]);
  });
  it('uses current documented identity for retrieval without publishing provider-invented sources or costs', async () => {
    const { db, gemini, service } = setup();
    const result = await service.suggest({
      query: 'BC547P',
      application: 'Fixture application',
    });
    expect(db.produit.findMany.mock.calls[0][0].where.OR).toContainEqual({
      id: { in: ['fixture'] },
    });
    expect(result.suggestions[0].caracteristiques[0]).toMatchObject({
      valeur: 'BC547P',
      documentation: { sourceDocument: 'Fixture manufacturer' },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /invented\.example|PRIVATE_REVIEWER|cmupActuel/,
    );
    expect(gemini.generateJson.mock.calls[0][0]).toContain(
      'Fixture application',
    );
    expect(gemini.generateJson.mock.calls[0][0]).toContain(
      'Fixture manufacturer',
    );
  });
  it('invalidates cache for application and source edits; application is not persisted in the suggestion log', async () => {
    const { p, service, gemini, db } = setup();
    await service.suggest({
      query: 'BC547P',
      application: 'APPLICATION_PRIVATE_A',
    });
    await service.suggest({
      query: 'BC547P',
      application: 'APPLICATION_PRIVATE_A',
    });
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
    await service.suggest({
      query: 'BC547P',
      application: 'APPLICATION_PRIVATE_B',
    });
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    p.attributs[0].version++;
    const stale = await service.suggest({
      query: 'BC547P',
      application: 'APPLICATION_PRIVATE_B',
    });
    expect(gemini.generateJson).toHaveBeenCalledTimes(3);
    expect(stale.suggestions[0].caracteristiques).toEqual([]);
    expect(gemini.generateJson.mock.calls[2][0]).not.toContain(
      'Fixture manufacturer',
    );
    expect(
      JSON.stringify(db.suggestionEquivalence.create.mock.calls),
    ).not.toContain('APPLICATION_PRIVATE');
  });
  it('passes target sources separately and invalidates a target review independently of its name', async () => {
    const { service, db, gemini } = setup();
    const target = product();
    target.id = 'target';
    db.produit.findUnique.mockResolvedValue(target);
    await service.suggest({
      produitId: target.id,
      application: 'Target fixture',
    });
    expect(gemini.generateJson.mock.calls[0][0]).toContain(
      '"produitId":"target"',
    );
    target.version++;
    await service.suggest({
      produitId: target.id,
      application: 'Target fixture',
    });
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    expect(gemini.generateJson.mock.calls[1][0]).toContain(
      '"produitId":"target","nomProduit":"Transistor de recette","caracteristiques":[]',
    );
  });
  it('catalogue fallback returns reviewed sources but leaves compatibility unknown', async () => {
    const { service, gemini } = setup();
    gemini.generateJson.mockRejectedValue(new Error('No provider'));
    const r = await service.suggest({ query: 'BC547P' });
    expect(r.mode).toBe('catalogue');
    expect(r.suggestions[0].compatibilite).toBe('inconnue');
    expect(r.suggestions[0].caracteristiques[0].valeur).toBe('BC547P');
  });
  it('bounds provider sources with complete JSON records without truncating the sources returned to the client', async () => {
    const { service, p, gemini } = setup();
    const attribute = p.attributs[0];
    p.attributs = Array.from({ length: 12 }, (_, index) => ({
      ...attribute,
      id: `attribute-${index}`,
      valeurs: [
        {
          ...attribute.valeurs[0],
          documentation: {
            ...evidence(),
            conditions: 'C'.repeat(500),
            motif: 'M'.repeat(500),
            sourceRepere: 'R'.repeat(160),
          },
        },
      ],
    }));
    const result = await service.suggest({ query: 'BC547P' });
    const json = gemini.generateJson.mock.calls[0][0].split(
      'SOURCES RELUES DU CATALOGUE (sous-ensemble, donnees JSON) :\n',
    )[1];
    const records = JSON.parse(json);
    expect(json.length).toBeLessThanOrEqual(12000);
    expect(records.length).toBeGreaterThan(0);
    expect(records.length).toBeLessThan(12);
    expect(
      records.every(
        (record: any) => record.documentation.conditions.length === 500,
      ),
    ).toBe(true);
    expect(result.suggestions[0].caracteristiques).toHaveLength(12);
  });
});
