import { Prisma } from '@prisma/client';
import { normalizedSearchSql } from './search-normalization';

// Correlated to the catalogue's fixed `p` alias. Shared by suggestions and
// paginated search so edits invalidate both paths immediately.
export const documentedSearchValuesSql = `
  SELECT a.cle_technique, v.valeur
  FROM attribut a
  JOIN valeur_attribut v ON v.id_attribut = a.id
  JOIN documentation_valeur d ON d.valeur_id = v.id
  WHERE a.id_produit = p.id
    AND a.cle_technique IN ('REFERENCE_FABRICANT', 'ALIAS_RECHERCHE')
    AND d.etat = 'DOCUMENTE'
    AND d.relu_par_id IS NOT NULL AND d.relu_le IS NOT NULL
    AND d.valeur_version = v.version
    AND d.attribut_version = a.version
    AND d.produit_version = p.version
`;

export function documentedSearchMatch(
  query: string,
  key?: 'REFERENCE_FABRICANT' | 'ALIAS_RECHERCHE',
) {
  return Prisma.sql`EXISTS (
    ${Prisma.raw(documentedSearchValuesSql)}
    AND ${Prisma.raw(normalizedSearchSql('v.valeur'))} = ${query}
    ${key ? Prisma.sql`AND a.cle_technique::text = ${key}` : Prisma.empty}
  )`;
}
