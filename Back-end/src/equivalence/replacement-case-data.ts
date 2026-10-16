import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ReplacementCaseDto } from './dto/replacement-case.dto';

// Exact scope only: preserve punctuation, suffixes, unit case and numerical
// constraints. A search alias or similar-looking marking never expands a case.
export const scopeApplication = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/g, ' ');
export const scopeReference = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/g, ' ');
export const fingerprint = (data: unknown) =>
  createHash('sha256').update(JSON.stringify(data)).digest('hex');
export const caseKey = (
  reference: string,
  cibleId: string | null,
  candidatId: string,
  application: string,
) =>
  fingerprint({
    reference: cibleId ? null : scopeReference(reference),
    cibleId,
    candidatId,
    application: scopeApplication(application),
  });

export function replacementData(input: ReplacementCaseDto) {
  const text = (key: keyof ReplacementCaseDto, max: number) => {
    const value = input[key];
    if (typeof value !== 'string' || !value.trim() || value.length > max)
      throw new BadRequestException(
        'Renseignez référence, usage, justification, limites et source précise.',
      );
    return value.trim();
  };
  if (
    !Number.isSafeInteger(input.version) ||
    input.version < 0 ||
    typeof input.retire !== 'boolean' ||
    ![
      'DIRECT_DOCUMENTE',
      'ADAPTATION_NECESSAIRE',
      'REFUSE',
      'A_CONFIRMER',
    ].includes(input.verdict)
  )
    throw new BadRequestException('État ou version du cas invalide.');
  const reference = text('reference', 255),
    application = scopeApplication(text('application', 500));
  if (scopeReference(reference).length > 255)
    throw new BadRequestException('La référence normalisée est trop longue.');
  let sourceUrl = text('sourceUrl', 800);
  try {
    const url = new URL(sourceUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.href.length > 800
    )
      throw Error();
    sourceUrl = url.href;
  } catch {
    throw new BadRequestException(
      'Utilisez une source HTTPS sans identifiants intégrés.',
    );
  }
  const optional = (key: 'adaptations' | 'sourceRevision', max: number) => {
    const value = input[key];
    if (value != null && (typeof value !== 'string' || value.length > max))
      throw new BadRequestException('Champ technique invalide.');
    return value?.trim() || null;
  };
  const adaptations = optional('adaptations', 1500);
  if (input.verdict === 'ADAPTATION_NECESSAIRE' && !adaptations)
    throw new BadRequestException('Décrivez les adaptations nécessaires.');
  if (input.verdict !== 'ADAPTATION_NECESSAIRE' && adaptations)
    throw new BadRequestException(
      'Une adaptation doit être classée adaptation nécessaire.',
    );
  if (
    !Array.isArray(input.valeurIds) ||
    !input.valeurIds.length ||
    input.valeurIds.length > 20 ||
    new Set(input.valeurIds).size !== input.valeurIds.length
  )
    throw new BadRequestException(
      'Choisissez entre une et vingt valeurs sources distinctes.',
    );
  const cibleId = input.cibleId || null;
  if (cibleId === input.candidatId)
    throw new BadRequestException(
      'La pièce cible et le remplacement doivent être distincts.',
    );
  return {
    reference,
    referenceCle: scopeReference(reference),
    cibleId,
    candidatId: input.candidatId,
    application,
    verdict: input.verdict,
    justification: text('justification', 1500),
    limites: text('limites', 1500),
    adaptations,
    sourceUrl,
    sourceDocument: text('sourceDocument', 200),
    sourceRepere: text('sourceRepere', 160),
    sourceRevision: optional('sourceRevision', 100),
    valeurIds: [...input.valeurIds].sort(),
    retire: input.retire,
    cleCas: caseKey(reference, cibleId, input.candidatId, application),
  };
}
