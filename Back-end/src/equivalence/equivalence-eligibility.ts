export const EQUIVALENCE_COMPONENT_CATEGORY = 'Composants Électroniques';

export const EQUIVALENCE_INELIGIBLE_MESSAGE =
  'Les équivalences sont disponibles uniquement pour les composants électroniques du catalogue X-electronic.';

export const EQUIVALENCE_NO_CANDIDATE_MESSAGE =
  'Aucun composant électronique du catalogue X-electronic en stock ne permet de proposer un équivalent.';

const COMPONENT_QUERY_PATTERNS = [
  'diode',
  'zener',
  'transistor',
  'mosfet',
  'thyristor',
  'triac',
  'resistance',
  'résistance',
  'condensateur',
  'capacitor',
  'led',
  'circuit',
  'integre',
  'intégré',
  'regulateur',
  'régulateur',
  'relais',
  'fusible',
  'inductance',
  'bobine',
  'quartz',
  'capteur',
  'optocoupleur',
  'ampli',
];

const ELECTRONIC_REFERENCE_PATTERN =
  /\b(1n|2n|bc|bd|bf|tip|irf|irfz|lm|ne|tl|uln|pc|moc|bt|bta|atmega|esp|stm|78\d{2}|79\d{2}|555)\w*/i;

export function normalizeEligibilityText(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function isElectronicComponentCategory(name?: string | null): boolean {
  return (
    normalizeEligibilityText(name) ===
    normalizeEligibilityText(EQUIVALENCE_COMPONENT_CATEGORY)
  );
}

export function isProductEligibleForEquivalence(product: any): boolean {
  return isElectronicComponentCategory(
    product?.categorie?.nom ?? product?.categorieNom ?? product?.categorie,
  );
}

export function looksLikeElectronicComponentQuery(query?: string | null): boolean {
  const normalized = normalizeEligibilityText(query);
  if (!normalized) return false;
  return (
    COMPONENT_QUERY_PATTERNS.some((pattern) =>
      normalized.includes(normalizeEligibilityText(pattern)),
    ) || ELECTRONIC_REFERENCE_PATTERN.test(query || '')
  );
}
