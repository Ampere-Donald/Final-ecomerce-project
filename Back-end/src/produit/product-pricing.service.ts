import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminRole, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import {
  CompleteProductPricingDto,
  MissingPricingQueryDto,
} from './dto/complete-product-pricing.dto';

export const PRICING_STAFF_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'VENDEUR',
  'CAISSIER',
];
export const INITIAL_PRICE_ACTION = 'INITIAL_PRODUCT_PRICE_SET';
const missingPrice: Prisma.ProduitWhereInput = {
  OR: [{ prixDetail: null }, { prixDetail: { lte: 0 } }],
};
const productSelect = {
  id: true,
  version: true,
  nomProduit: true,
  marque: true,
  code: true,
  codeFamille: true,
  imageUrl: true,
  prixDetail: true,
  prixDemiGros: true,
  prixGros: true,
  quantiteStock: true,
  estActif: true,
  categorie: { select: { id: true, nom: true } },
} satisfies Prisma.ProduitSelect;

@Injectable()
export class ProductPricingService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: MissingPricingQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ProduitWhereInput = {
      AND: [missingPrice],
      ...(query.visibility ? { estActif: query.visibility === 'active' } : {}),
      ...(query.categoryId ? { categorieId: query.categoryId } : {}),
      ...(query.inStock === 'true' ? { quantiteStock: { gt: 0 } } : {}),
    };
    if (search)
      (where.AND as Prisma.ProduitWhereInput[]).push({
        OR: ['nomProduit', 'marque', 'code', 'codeFamille'].map((key) => ({
          [key]: { contains: search, mode: 'insensitive' },
        })),
      });
    const page = query.page || 1,
      limit = query.limit || 24;
    const [
      data,
      total,
      totalCount,
      missingCount,
      grouped,
      categories,
      activity,
    ] = await Promise.all([
      this.db.produit.findMany({
        where,
        select: productSelect,
        orderBy: [
          { estActif: 'desc' },
          { quantiteStock: 'desc' },
          { nomProduit: 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.produit.count({ where }),
      this.db.produit.count(),
      this.db.produit.count({ where: missingPrice }),
      this.db.produit.groupBy({
        by: ['categorieId'],
        where: missingPrice,
        _count: { _all: true },
      }),
      this.db.categorie.findMany({
        where: { produits: { some: missingPrice } },
        select: { id: true, nom: true },
        orderBy: { nom: 'asc' },
      }),
      this.db.activityLog.findMany({
        where: { action: INITIAL_PRICE_ACTION },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          details: true,
          createdAt: true,
          adminUser: { select: { nom: true } },
        },
      }),
    ]);
    const counts = new Map(
      grouped.map((row) => [row.categorieId, row._count._all]),
    );
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalCount,
        missingCount,
        pricedCount: totalCount - missingCount,
      },
      categories: categories.map((category) => ({
        ...category,
        count: counts.get(category.id) || 0,
      })),
      recentActivity: activity.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        author: row.adminUser.nom,
        ...(row.details as Prisma.JsonObject),
      })),
    };
  }

  async complete(
    id: string,
    input: CompleteProductPricingDto,
    actor: { id: string; nom: string; role: string },
  ) {
    if (!PRICING_STAFF_ROLES.some((role) => role === actor.role))
      throw new ForbiddenException(
        'Accès réservé au personnel de la boutique.',
      );
    if (!Number.isSafeInteger(input.prixDetail) || input.prixDetail <= 0)
      throw new BadRequestException(
        'Le prix détail est obligatoire et doit être positif.',
      );
    for (const value of [
      input.prixDetail,
      input.prixDemiGros,
      input.prixGros,
    ].filter((value) => value !== undefined)) {
      if (!Number.isSafeInteger(value) || value! <= 0 || value! > 1_000_000_000)
        throw new BadRequestException(
          'Saisissez un prix positif en FCFA, sans décimales.',
        );
    }
    return this.db.$transaction(async (tx) => {
      const product = await tx.produit.findUnique({
        where: { id },
        select: { ...productSelect, estActif: true },
      });
      if (!product) throw new NotFoundException('Cet article est introuvable.');
      if ((product.prixDetail ?? 0) > 0)
        throw new ConflictException(
          'Un prix a déjà été renseigné pour cet article. Il a été retiré de la liste ; aucun prix n’a été écrasé.',
        );
      if (product.version !== input.version)
        throw new ConflictException(
          'La fiche a été modifiée par un autre membre. Actualisez la liste avant de réessayer.',
        );
      const data: Prisma.ProduitUpdateManyMutationInput = {
        prixDetail: input.prixDetail,
        version: { increment: 1 },
      };
      for (const field of ['prixDemiGros', 'prixGros'] as const) {
        if (input[field] === undefined) continue;
        if ((product[field] ?? 0) > 0 && product[field] !== input[field])
          throw new ConflictException(
            'Un tarif dégressif existe déjà. Les tarifs existants sont conservés.',
          );
        if ((product[field] ?? 0) <= 0) data[field] = input[field];
      }
      const demi =
          input.prixDemiGros ??
          ((product.prixDemiGros ?? 0) > 0 ? product.prixDemiGros : null),
        gros =
          input.prixGros ??
          ((product.prixGros ?? 0) > 0 ? product.prixGros : null);
      if (
        (demi && demi > input.prixDetail) ||
        (gros && gros > (demi && demi > 0 ? demi : input.prixDetail))
      ) {
        throw new BadRequestException(
          'Le demi-gros doit être inférieur ou égal au détail, et le gros inférieur ou égal au demi-gros (ou au détail).',
        );
      }
      // The predicate is checked again by PostgreSQL after a concurrent writer finishes.
      const updated = await tx.produit.updateMany({
        where: { id, version: input.version, AND: [missingPrice] },
        data,
      });
      if (updated.count !== 1)
        throw new ConflictException(
          'Cet article vient d’être modifié. Actualisez la liste ; aucun prix n’a été écrasé.',
        );
      await tx.activityLog.create({
        data: {
          adminUserId: actor.id,
          action: INITIAL_PRICE_ACTION,
          details: {
            productId: id,
            productName: product.nomProduit,
            code: product.code,
            prixDetail: input.prixDetail,
            prixDemiGros: demi ?? null,
            prixGros: gros ?? null,
            previousPrixDetail: product.prixDetail,
            actorRole: actor.role,
            wasActive: product.estActif,
          },
        },
      });
      return {
        id,
        nomProduit: product.nomProduit,
        prixDetail: input.prixDetail,
        version: input.version + 1,
        author: actor.nom,
        estActif: product.estActif,
      };
    });
  }
}
