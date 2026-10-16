import { CleAttributTechnique } from '@prisma/client';
import { validate } from 'class-validator';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { technicalDictionary } from './technical-dictionary';
import { CreateAttributDto } from './dto/create-attribut.dto';
import { masquerCouts } from '../produit/public-product';

describe('Explicit technical dictionary', () => {
  it('projects translated semantic labels while retaining the source label and hiding private costs', () => {
    const result = masquerCouts({
      version: 1,
      cmupActuel: 999,
      attributs: [
        {
          nomAttribut: 'Tension',
          cleTechnique: 'ALIMENTATION_SORTIE_TENSION',
          valeurs: [],
        },
      ],
    });
    expect(result.attributs[0]).toMatchObject({
      nomAttribut: 'Tension',
      libelleTechnique: { fr: 'Tension de sortie', en: 'Output voltage' },
    });
    expect(result.cmupActuel).toBeUndefined();
  });
  it('covers each stored key exactly once, with distinct semantic roles and translated labels', () => {
    const dictionary = technicalDictionary();
    expect(dictionary.entries.map((e) => e.key).sort()).toEqual(
      Object.values(CleAttributTechnique).sort(),
    );
    const groups = new Set(dictionary.groups.map((g) => g.key));
    expect(
      dictionary.entries.every((e) => groups.has(e.group) && e.fr && e.en),
    ).toBe(true);
    expect(
      dictionary.entries.filter((e) => e.key.startsWith('ALIMENTATION_')),
    ).toHaveLength(8);
    expect(new Set(dictionary.entries.map((e) => e.key)).size).toBe(
      dictionary.entries.length,
    );
  });
  it('only adds enum values; historical attributes and values are never guessed or backfilled', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        'prisma/migrations/20261012220000_technical_dictionary_keys/migration.sql',
      ),
      'utf8',
    );
    const keys = [
      ...sql.matchAll(
        /ALTER TYPE "CleAttributTechnique" ADD VALUE '([A-Z_]+)';/g,
      ),
    ].map((m) => m[1]);
    expect(keys.sort()).toEqual(
      Object.values(CleAttributTechnique)
        .filter((k) => !['REFERENCE_FABRICANT', 'ALIAS_RECHERCHE'].includes(k))
        .sort(),
    );
    expect(sql).not.toMatch(/\b(?:UPDATE|DELETE|DROP|INSERT)\b/);
  });
  it('accepts the explicit parameter key but rejects a guessed/unknown key', async () => {
    const dto = Object.assign(new CreateAttributDto(), {
      produitId: 'e720a788-353a-4676-a619-2d4a519d82f5',
      nomAttribut: 'Nom original',
      typeAttribut: 'TEXTE',
      cleTechnique: 'ALIMENTATION_SORTIE_TENSION',
    });
    expect(await validate(dto)).toEqual([]);
    dto.cleTechnique = 'TENSION' as CleAttributTechnique;
    expect((await validate(dto)).map((e) => e.property)).toContain(
      'cleTechnique',
    );
  });
});
