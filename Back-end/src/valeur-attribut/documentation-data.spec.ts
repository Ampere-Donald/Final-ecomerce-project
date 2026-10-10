import { BadRequestException } from '@nestjs/common';
import { documentationData, publicDocumentation } from './documentation-data';
import { DocumentationValeurDto } from './dto/documentation-valeur.dto';
import { masquerCouts } from '../produit/public-product';

const draft = (
  patch: Partial<DocumentationValeurDto> = {},
): DocumentationValeurDto => ({
  version: 0,
  valeurVersion: 1,
  attributVersion: 1,
  produitVersion: 1,
  etat: 'A_VERIFIER',
  ...patch,
});
const source = {
  sourceUrl: 'https://manufacturer.example/spec.pdf',
  sourceDocument: 'Notice fabricant, modèle exact',
  sourceRepere: 'page 2, tableau 1',
  motif: 'Valeur et conditions relues dans le document.',
};

describe('Documentation technique et projection publique', () => {
  it.each(['INCONNU', 'CONTRADICTOIRE', 'NON_APPLICABLE'] as const)(
    'ne promeut pas %s en donnée documentée',
    (etat) => {
      expect(() => documentationData(draft({ ...source, etat }), true)).toThrow(
        BadRequestException,
      );
    },
  );
  it('conserve le texte et les unités sources, sans conversion automatique', () => {
    expect(
      documentationData(
        draft({
          uniteSource: ' mA ',
          valeurNormalisee: '0.001',
          uniteNormalisee: 'A',
        }),
      ),
    ).toMatchObject({
      uniteSource: 'mA',
      valeurNormalisee: '0.001',
      uniteNormalisee: 'A',
    });
  });
  it.each(['INCONNU', 'CONTRADICTOIRE', 'NON_APPLICABLE'] as const)(
    'ne normalise pas %s en valeur certaine',
    (etat) => {
      expect(() =>
        documentationData(
          draft({
            etat,
            motif: 'Explication',
            valeurNormalisee: '0',
            uniteNormalisee: 'A',
          }),
        ),
      ).toThrow(BadRequestException);
    },
  );
  it('accepte un zéro documentable sans le confondre avec inconnu', () => {
    expect(
      documentationData(
        draft({ ...source, valeurNormalisee: '0', uniteNormalisee: 'V' }),
        true,
      ),
    ).toMatchObject({ valeurNormalisee: '0' });
  });
  it.each([
    { valeurNormalisee: '1' },
    { uniteNormalisee: 'V' },
    { valeurNormalisee: '1-5', uniteNormalisee: 'V' },
    { valeurNormalisee: 'NaN', uniteNormalisee: 'V' },
    { version: -1 },
    { valeurVersion: 0 },
    { etat: 'DOCUMENTE' },
    { etat: 'CONTRADICTOIRE' },
    { etat: 'NON_APPLICABLE' },
  ])('refuse une donnée invalide %j', (patch) => {
    expect(() =>
      documentationData(draft(patch as Partial<DocumentationValeurDto>)),
    ).toThrow(BadRequestException);
  });
  it.each([
    'javascript:alert(1)',
    'http://example.com',
    'https://user:secret@example.com/spec',
  ])('refuse une URL non publiable %s', (sourceUrl) => {
    expect(() => documentationData(draft({ sourceUrl }))).toThrow(
      BadRequestException,
    );
  });
  it.each(['sourceUrl', 'sourceDocument', 'sourceRepere', 'motif'] as const)(
    'exige %s pour la relecture',
    (key) => {
      expect(() =>
        documentationData(draft({ ...source, [key]: ' ' }), true),
      ).toThrow(BadRequestException);
    },
  );
  it('une annotation absente reste à vérifier et une relecture sans identité ne certifie rien', () => {
    expect(publicDocumentation({ version: 1 }, 1)).toEqual({
      etat: 'A_VERIFIER',
      obsolete: false,
    });
    expect(
      publicDocumentation(
        {
          version: 1,
          documentation: {
            valeurVersion: 1,
            attributVersion: 1,
            etat: 'DOCUMENTE',
          },
        },
        1,
      ).etat,
    ).toBe('A_VERIFIER');
  });
  it.each([
    { version: 2, attributVersion: 1, produitVersion: 1 },
    { version: 1, attributVersion: 2, produitVersion: 1 },
    { version: 1, attributVersion: 1, produitVersion: 2 },
  ])('une modification rend la source obsolète %j', (current) => {
    expect(
      publicDocumentation(
        {
          version: current.version,
          documentation: {
            valeurVersion: 1,
            attributVersion: 1,
            produitVersion: 1,
            etat: 'DOCUMENTE',
            reluLe: new Date(),
            reluParId: 'PRIVATE_REVIEWER',
            ...source,
          },
        },
        current.attributVersion,
        current.produitVersion,
      ),
    ).toEqual({ etat: 'A_VERIFIER', obsolete: true });
  });
  it('ne publie ni identité du relecteur ni champs internes de documentation dans une fiche', () => {
    const d = {
      version: 7,
      valeurVersion: 1,
      attributVersion: 1,
      produitVersion: 1,
      etat: 'DOCUMENTE',
      reluLe: new Date(),
      reluParId: 'PRIVATE_REVIEWER',
      internal: 'PRIVATE',
      ...source,
    };
    const p = masquerCouts({
      version: 1,
      cmupActuel: 900,
      attributs: [
        {
          version: 1,
          nomAttribut: 'Courant',
          valeurs: [{ version: 1, valeur: '1000 mA', documentation: d }],
        },
      ],
    });
    expect(p.attributs[0].valeurs[0].valeur).toBe('1000 mA');
    expect(p.attributs[0].valeurs[0].documentation.etat).toBe('DOCUMENTE');
    expect(JSON.stringify(p)).not.toContain('PRIVATE');
    expect(p).not.toHaveProperty('cmupActuel');
  });
});
