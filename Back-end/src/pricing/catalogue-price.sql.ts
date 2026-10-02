import { Prisma } from '@prisma/client';

// PostgreSQL counterpart of cataloguePricing. Positive Float values are
// rounded with floor(x * 100 + .5), matching JS Math.round for this domain.
export function cataloguePriceSql(now: Date) {
  const base = amountSql(Prisma.sql`p.prix_detail`);
  const promo = amountSql(Prisma.sql`p.prix_promo`);
  return Prisma.sql`CASE WHEN p.est_actif = TRUE
    AND ${base} IS NOT NULL AND ${promo} IS NOT NULL
    AND ${promo} < ${base} AND p.fin_promo > ${now}
    THEN ${promo} ELSE ${base} END`;
}

function amountSql(column: Prisma.Sql) {
  return Prisma.sql`CASE WHEN ${column} > 0
    AND floor(${column} * 100 + 0.5) BETWEEN 1 AND 9007199254740991
    THEN floor(${column} * 100 + 0.5) / 100 ELSE NULL END`;
}
