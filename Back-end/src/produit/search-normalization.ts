// Search keys only: never rewrite the stored/displayed name or reference.
export const normalizeSalesSearch = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const columns = [
  'p.nom_produit',
  'p.designation_en',
  'p.marque',
  'p.code_famille',
  'p.code',
  'p.description',
  'c.nom',
] as const;
export type SearchColumn = (typeof columns)[number];

// Only fixed internal column identifiers are interpolated. Query input stays
// bound separately. PostgreSQL UTF8 normalize(NFD) matches the JS key above.
// Normalize before lower so uppercase accented Latin letters work in C locales.
export function normalizedSearchSql(column: SearchColumn): string {
  if (!(columns as readonly string[]).includes(column))
    throw new Error('Unsupported search column');
  return `btrim(regexp_replace(lower(regexp_replace(normalize(coalesce(${column}, ''), NFD), '[\u0300-\u036f]', '', 'g')), '[^a-z0-9]+', ' ', 'g'))`;
}
