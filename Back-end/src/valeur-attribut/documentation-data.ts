import { BadRequestException } from '@nestjs/common';
import { DocumentationValeurDto } from './dto/documentation-valeur.dto';

const fields = {
  uniteSource: 40,
  valeurNormalisee: 100,
  uniteNormalisee: 40,
  conditions: 500,
  sourceUrl: 800,
  sourceDocument: 200,
  sourceRepere: 160,
  sourceRevision: 100,
  motif: 500,
} as const;

export function documentationData(
  input: DocumentationValeurDto,
  review = false,
) {
  if (review && input.etat !== 'A_VERIFIER')
    throw new BadRequestException(
      'Résolvez les données inconnues ou contradictoires avant de documenter.',
    );
  const data = Object.fromEntries(
    Object.entries(fields).map(([key, length]) => {
      const raw = input[key as keyof typeof fields];
      if (raw != null && (typeof raw !== 'string' || raw.length > length))
        throw new BadRequestException('Champ de documentation invalide.');
      return [key, raw?.trim() || null];
    }),
  ) as Record<keyof typeof fields, string | null>;
  if (
    !['INCONNU', 'A_VERIFIER', 'CONTRADICTOIRE', 'NON_APPLICABLE'].includes(
      input.etat,
    )
  )
    throw new BadRequestException(
      'La documentation demande une relecture explicite.',
    );
  for (const key of [
    'version',
    'valeurVersion',
    'attributVersion',
    'produitVersion',
  ] as const)
    if (
      !Number.isSafeInteger(input[key]) ||
      input[key] < (key === 'version' ? 0 : 1)
    )
      throw new BadRequestException('Versions de documentation invalides.');
  if (data.sourceUrl) {
    try {
      const url = new URL(data.sourceUrl);
      if (url.protocol !== 'https:' || url.username || url.password)
        throw Error();
      data.sourceUrl = url.href;
      if (data.sourceUrl.length > fields.sourceUrl) throw Error();
    } catch {
      throw new BadRequestException(
        'Utilisez une URL HTTPS sans identifiants intégrés.',
      );
    }
  }
  if (
    Boolean(data.valeurNormalisee) !== Boolean(data.uniteNormalisee) ||
    (data.valeurNormalisee &&
      !/^[+-]?\d+(?:\.\d+)?$/.test(data.valeurNormalisee))
  )
    throw new BadRequestException(
      'Renseignez une valeur décimale et son unité ensemble.',
    );
  if (
    ['INCONNU', 'CONTRADICTOIRE', 'NON_APPLICABLE'].includes(input.etat) &&
    data.valeurNormalisee
  )
    throw new BadRequestException(
      'Une donnée non établie ne reçoit pas de valeur normalisée.',
    );
  if (['CONTRADICTOIRE', 'NON_APPLICABLE'].includes(input.etat) && !data.motif)
    throw new BadRequestException(
      'Expliquez la contradiction ou la non-application.',
    );
  if (
    review &&
    (!data.sourceUrl ||
      !data.sourceDocument ||
      !data.sourceRepere ||
      !data.motif)
  )
    throw new BadRequestException(
      'La relecture exige document, URL, page/section et note de décision.',
    );
  return data;
}

// Explicit public projection. Reviewer identity is private. A name/value edit
// makes a previous annotation stale, including normalization and source context.
export function publicDocumentation(
  value: any,
  attributVersion: number,
  produitVersion?: number,
) {
  const d = value.documentation;
  if (!d) return { etat: 'A_VERIFIER', obsolete: false };
  const current =
    d.valeurVersion === value.version &&
    d.attributVersion === attributVersion &&
    d.produitVersion === produitVersion &&
    Number.isSafeInteger(produitVersion);
  if (!current) return { etat: 'A_VERIFIER', obsolete: true };
  const reviewed = d.etat === 'DOCUMENTE' && Boolean(d.reluParId && d.reluLe);
  return {
    etat: d.etat === 'DOCUMENTE' && !reviewed ? 'A_VERIFIER' : d.etat,
    obsolete: false,
    ...Object.fromEntries(
      Object.keys(fields).map((key) => [key, d[key] ?? null]),
    ),
    reluLe: reviewed ? d.reluLe : null,
  };
}
