import { BadRequestException } from '@nestjs/common';
import {
  hash,
  publicProject,
  technicalFingerprint,
  projectUrl,
} from './projet-data';

export const product = (changes: any = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  nomProduit: 'Pièce fictive',
  code: 'DEMO-A-N',
  estActif: true,
  categorieId: 'family',
  categorie: { id: 'family', nom: 'Démo', secret: 'PRIVATE_CATEGORY' },
  prixDetail: 3000,
  quantiteStock: 10,
  attributs: [
    {
      nomAttribut: 'Tension',
      secret: 'PRIVATE_ATTRIBUTE',
      valeurs: [{ valeur: '5 V', secret: 'PRIVATE_VALUE' }],
    },
  ],
  cmupActuel: 'PRIVATE_COST',
  prixGros: 'PRIVATE_PRICE',
  quantiteReservee: 'PRIVATE_RESERVATION',
  ...changes,
});
export const project = (changes: any = {}) => {
  const p = product();
  return {
    id: 'project',
    slug: 'demo-projet',
    version: 2,
    validationVersion: 2,
    valideAt: new Date(),
    noteValidation: 'PRIVATE_NOTE',
    valideParId: 'PRIVATE_ACTOR',
    historique: ['PRIVATE_HISTORY'],
    lignes: [
      {
        id: '00000000-0000-4000-8000-000000000003',
        quantite: 2,
        necessaire: true,
        reference: p.code,
        produit: p,
        empreinteTechnique: technicalFingerprint(p),
      },
    ],
    ...changes,
  };
};
describe('project public contracts', () => {
  it('does not expose internal costs, validation notes, receipts or nested management fields', () => {
    const result = publicProject(project());
    expect(JSON.stringify(result)).not.toContain('PRIVATE_');
    expect(result.materielRequisDisponible).toBe(true);
    expect(result.lignes[0].montant).toBe(6000);
  });
  it('keeps commercial price/stock changes separate from technical validation', () => {
    const row = project();
    row.lignes[0].produit.prixDetail = 4000;
    row.lignes[0].produit.quantiteStock = 0;
    const result = publicProject(row);
    expect(result.validationActuelle).toBe(true);
    expect(result.materielRequisDisponible).toBe(false);
    expect(result.lignes[0].montant).toBe(8000);
  });
  it.each(['code', 'description', 'categorieId', 'urlDatasheet', 'marque'])(
    'requires revalidation after changed %s',
    (key) => {
      const row = project();
      row.lignes[0].produit[key] = 'Changed';
      expect(publicProject(row).validationActuelle).toBe(false);
    },
  );
  it('detects a changed technical attribute without erasing the unit or suffix', () => {
    const row = project();
    row.lignes[0].produit.attributs[0].valeurs[0].valeur = '3.3 V';
    const result = publicProject(row);
    expect(result.validationActuelle).toBe(false);
    expect(result.lignes[0].referenceAttendue).toBe('DEMO-A-N');
    expect(result.lignes[0].produit!.attributs[0].valeurs[0].valeur).toBe(
      '3.3 V',
    );
  });
  it.each([null, { estActif: false }])(
    'preserves a missing/inactive line without substituting it',
    (unavailable) => {
      const row = project();
      row.lignes[0].produit = unavailable as any;
      const result = publicProject(row);
      expect(result.validationActuelle).toBe(false);
      expect(result.lignes[0].produit).toBeNull();
      expect(result.lignes[0].referenceAttendue).toBe('DEMO-A-N');
    },
  );
  it.each([null, 0, -2, Infinity, Number.MAX_VALUE])(
    'does not invent a price or accept overflow: %s',
    (price) => {
      const row = project();
      row.lignes[0].produit.prixDetail = price;
      expect(publicProject(row).lignes[0].montant).toBeNull();
      expect(publicProject(row).materielRequisDisponible).toBe(false);
    },
  );
  it('distinguishes an unavailable accessory from unavailable required material', () => {
    const row = project();
    const optional = structuredClone(row.lignes[0]);
    optional.necessaire = false;
    optional.produit.quantiteStock = 0;
    row.lignes.push(optional);
    expect(publicProject(row).materielRequisDisponible).toBe(true);
    expect(
      publicProject({ ...row, lignes: [optional] }).materielRequisDisponible,
    ).toBe(false);
    expect(
      publicProject({ ...row, validationVersion: 1 }).validationActuelle,
    ).toBe(false);
  });
  it('normalizes only object key ordering for replay and preserves array ordering', () => {
    expect(hash({ a: 1, b: { x: 2, y: 3 } })).toBe(
      hash({ b: { y: 3, x: 2 }, a: 1 }),
    );
    expect(hash([1, 2])).not.toBe(hash([2, 1]));
    expect(hash({ a: undefined, b: new Date('2026-01-01') })).toBe(
      hash({ b: '2026-01-01T00:00:00.000Z' }),
    );
  });
  it('ignores ordering and duplicates in technical attribute values', () => {
    const a = product({
      attributs: [
        {
          nomAttribut: 'B',
          valeurs: [{ valeur: '2' }, { valeur: '1' }, { valeur: '2' }],
        },
        { nomAttribut: 'A', valeurs: [] },
      ],
    });
    const b = product({
      attributs: [
        { nomAttribut: 'A', valeurs: [] },
        { nomAttribut: 'B', valeurs: [{ valeur: '1' }, { valeur: '2' }] },
      ],
    });
    expect(technicalFingerprint(a)).toBe(technicalFingerprint(b));
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'https://name:password@example.com',
    'file:///secret',
  ])('rejects unsafe document URLs %s', (value) => {
    expect(() => projectUrl(value)).toThrow(BadRequestException);
  });
  it('allows local marketing images and public documentation without fetching them', () => {
    expect(projectUrl('/design-e/demo.webp', true)).toBe('/design-e/demo.webp');
    expect(projectUrl('https://example.com/document.pdf')).toBe(
      'https://example.com/document.pdf',
    );
  });
});
