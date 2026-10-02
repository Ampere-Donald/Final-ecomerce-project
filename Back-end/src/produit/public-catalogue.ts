import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cataloguePriceSql } from '../pricing/catalogue-price.sql';

export interface PublicCatalogueParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  codeFamille?: string;
  code?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
}

const contains = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

export async function publicCatalogue(
  db: any,
  params: PublicCatalogueParams,
  now: Date,
  candidateIds?: string[],
) {
  const page = Number.isFinite(params.page)
    ? Math.max(1, Math.floor(params.page!))
    : 1;
  const limit = Number.isFinite(params.limit)
    ? Math.min(500, Math.max(1, Math.floor(params.limit!)))
    : 50;
  if (!Number.isSafeInteger((page - 1) * limit))
    throw new BadRequestException('Page hors limites.');
  for (const price of [params.minPrice, params.maxPrice]) {
    if (price !== undefined && (!Number.isFinite(price) || price < 0))
      throw new BadRequestException(
        'Les bornes de prix doivent être positives ou nulles.',
      );
  }
  if (
    params.minPrice !== undefined &&
    params.maxPrice !== undefined &&
    params.minPrice > params.maxPrice
  )
    throw new BadRequestException('Le prix minimum dépasse le prix maximum.');

  const conditions: Prisma.Sql[] = [Prisma.sql`p.est_actif = TRUE`];
  if (params.categoryId)
    conditions.push(Prisma.sql`p.id_categorie = ${params.categoryId}`);
  for (const [field, value] of [
    [Prisma.sql`p.code_famille`, params.codeFamille],
    [Prisma.sql`p.code`, params.code],
  ] as Array<[Prisma.Sql, string | undefined]>)
    if (value) conditions.push(Prisma.sql`${field} ILIKE ${contains(value)}`);
  if (candidateIds !== undefined) {
    conditions.push(
      candidateIds.length
        ? Prisma.sql`p.id IN (${Prisma.join(candidateIds)})`
        : Prisma.sql`FALSE`,
    );
  } else {
    const search = String(params.search || '')
      .trim()
      .slice(0, 120);
    if (search) {
      const pattern = contains(search);
      conditions.push(Prisma.sql`(p.nom_produit ILIKE ${pattern}
        OR p.designation_en ILIKE ${pattern} OR p.marque ILIKE ${pattern}
        OR p.code_famille ILIKE ${pattern} OR p.code ILIKE ${pattern}
        OR p.description ILIKE ${pattern} OR c.nom ILIKE ${pattern})`);
    }
  }
  const filters: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (params.minPrice !== undefined)
    filters.push(Prisma.sql`e.price >= ${params.minPrice}`);
  if (params.maxPrice !== undefined)
    filters.push(Prisma.sql`e.price <= ${params.maxPrice}`);
  if (params.inStock) filters.push(Prisma.sql`e.available > 0`);
  const orders = new Map<string, Prisma.Sql>([
    ['price_asc', Prisma.sql`e.price ASC NULLS LAST, e.id ASC`],
    ['price_desc', Prisma.sql`e.price DESC NULLS LAST, e.id ASC`],
    ['name_asc', Prisma.sql`e.name ASC, e.id ASC`],
    ['name_desc', Prisma.sql`e.name DESC, e.id ASC`],
  ]);
  const relevance = candidateIds?.length
    ? Prisma.sql`array_position(ARRAY[${Prisma.join(candidateIds)}]::text[], e.id) ASC, e.id ASC`
    : Prisma.sql`e.added DESC, e.id ASC`;
  const order = orders.get(params.sort || '') || relevance;

  return await db.$transaction(
    async (tx: any) => {
      const [selection] = await tx.$queryRaw(Prisma.sql`
      WITH reserved AS (
        SELECT l.produit_id, sum(l.quantite) AS quantity
        FROM ligne_ticket l JOIN ticket_vente t ON t.id = l.ticket_id
        WHERE t.statut = 'EN_ATTENTE' AND t.expires_at > ${now}
        GROUP BY l.produit_id
      ), priced AS (
        SELECT p.id, p.nom_produit AS name, p.date_ajout AS added,
          ${cataloguePriceSql(now)} AS price,
          greatest(0, p.quantite_stock - coalesce(r.quantity, 0)) AS available
        FROM produit p JOIN categorie c ON c.id = p.id_categorie
        LEFT JOIN reserved r ON r.produit_id = p.id
        WHERE ${Prisma.join(conditions, ' AND ')}
      ), eligible AS (
        SELECT * FROM priced e WHERE ${Prisma.join(filters, ' AND ')}
      ), page AS (
        SELECT e.id, e.available, row_number() OVER (ORDER BY ${order}) AS position
        FROM eligible e ORDER BY ${order}
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      )
      SELECT (SELECT count(*) FROM eligible) AS total,
        coalesce((SELECT jsonb_agg(page ORDER BY position) FROM page), '[]'::jsonb) AS rows
    `);
      const ids = selection.rows.map((row: any) => row.id);
      const products = ids.length
        ? await tx.produit.findMany({
            where: { id: { in: ids } },
            include: { categorie: true, attributs: true },
          })
        : [];
      const byId = new Map(
        products.map((product: any) => [product.id, product]),
      );
      const total = Number(selection.total);
      return {
        data: selection.rows.map((row: any) => ({
          ...(byId.get(row.id) as any),
          quantiteDisponibleVente: Number(row.available),
        })),
        meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function publicPriceMetadata(db: any, now: Date) {
  const [row] = await db.$queryRaw(Prisma.sql`
    SELECT min(price) AS "minPrice", max(price) AS "maxPrice"
    FROM (SELECT ${cataloguePriceSql(now)} AS price FROM produit p WHERE p.est_actif = TRUE) priced
  `);
  return { minPrice: row.minPrice ?? 0, maxPrice: row.maxPrice ?? 1000000 };
}
