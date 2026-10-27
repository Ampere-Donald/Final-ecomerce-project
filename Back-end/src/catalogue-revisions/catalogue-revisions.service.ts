import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  CatalogueBatchDto,
  CatalogueChangesDto,
  CatalogueMutationDto,
  SousCategorieDto,
} from './catalogue-revisions.dto';

export const catalogueSelect = {
  id: true,
  nomProduit: true,
  marque: true,
  code: true,
  codeFamille: true,
  imageUrl: true,
  prixDetail: true,
  prixDemiGros: true,
  prixGros: true,
  prixPromo: true,
  finPromo: true,
  quantiteGros: true,
  quantiteStock: true,
  categorieId: true,
  sousCategorieId: true,
  estActif: true,
  prixRevision: true,
  classementRevision: true,
  commercialRevision: true,
  prixVerifieRevision: true,
  prixVerifieAt: true,
  prixVerifiePar: true,
  classementVerifieRevision: true,
  classementVerifieAt: true,
  classementVerifiePar: true,
  categorie: { select: { id: true, nom: true } },
  sousCategorie: { select: { id: true, nom: true } },
} as const;
const json = (value: any) => JSON.parse(JSON.stringify(value));
const stable = (value: any): any =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
        )
      : value;
const adminRole = (actor: any) =>
  ['ADMIN', 'SUPER_ADMIN'].includes(actor?.role);
export const priceKeys = [
  'prixDetail',
  'prixDemiGros',
  'prixGros',
  'prixPromo',
  'finPromo',
  'quantiteGros',
];

export function validateCataloguePrices(p: any) {
  if (!(p.prixDetail > 0) || !Number.isFinite(p.prixDetail))
    throw new BadRequestException(
      'Renseignez un prix détail supérieur à zéro avant de valider.',
    );
  for (const key of ['prixDemiGros', 'prixGros', 'prixPromo']) {
    if (p[key] != null && (!Number.isFinite(p[key]) || p[key] <= 0))
      throw new BadRequestException(
        'Un tarif renseigné doit être supérieur à zéro ; effacez un tarif absent.',
      );
  }
  if (
    (p.prixDemiGros != null && p.prixDemiGros > p.prixDetail) ||
    (p.prixGros != null && p.prixGros > (p.prixDemiGros ?? p.prixDetail))
  ) {
    throw new BadRequestException(
      'Respectez l’ordre : gros ≤ demi-gros ≤ détail.',
    );
  }
  if (p.prixPromo != null && p.prixPromo >= p.prixDetail)
    throw new BadRequestException(
      'La promotion doit être inférieure au prix détail.',
    );
  if (p.prixPromo != null && !p.finPromo)
    throw new BadRequestException(
      'Indiquez la date de fin de promotion ou retirez la promotion.',
    );
}

@Injectable()
export class CatalogueRevisionsService {
  constructor(private readonly db: DatabaseService) {}

  private stateWhere(state: string) {
    const pending = {
      propositionsCatalogue: { some: { statut: 'EN_ATTENTE' } },
    };
    const noPending = {
      propositionsCatalogue: { none: { statut: 'EN_ATTENTE' } },
    };
    const discussion = {
      propositionsCatalogue: {
        some: { statut: 'EN_ATTENTE', type: 'DISCUSSION' },
      },
    };
    if (state === 'A_DISCUTER') return discussion;
    if (state === 'PROPOSITIONS')
      return { AND: [pending, { NOT: discussion }] };
    if (state === 'VERIFIES')
      return {
        AND: [
          noPending,
          {
            prixVerifieRevision: {
              equals: this.db.produit.fields.prixRevision,
            },
          },
        ],
      };
    return {
      AND: [
        noPending,
        {
          OR: [
            { prixVerifieRevision: null },
            {
              NOT: {
                prixVerifieRevision: {
                  equals: this.db.produit.fields.prixRevision,
                },
              },
            },
          ],
        },
      ],
    };
  }

  async list(query: Record<string, string> = {}) {
    const page = Math.min(
      100000,
      Math.max(1, Math.floor(Number(query.page) || 1)),
    );
    const limit = Math.min(
      50,
      Math.max(1, Math.floor(Number(query.limit) || 24)),
    );
    const base: any = { estActif: query.archives === 'true' ? false : true };
    if (query.search?.trim())
      base.OR = ['nomProduit', 'code', 'codeFamille'].map((key) => ({
        [key]: {
          contains: query.search.trim().slice(0, 150),
          mode: 'insensitive',
        },
      }));
    if (query.categorieId) base.categorieId = query.categorieId;
    if (query.sousCategorieId) base.sousCategorieId = query.sousCategorieId;
    if (query.auteurId)
      base.propositionsCatalogue = { some: { auteurId: query.auteurId } };
    if (query.classement === 'a-verifier')
      base.AND = [
        {
          OR: [
            { classementVerifieRevision: null },
            {
              NOT: {
                classementVerifieRevision: {
                  equals: this.db.produit.fields.classementRevision,
                },
              },
            },
          ],
        },
      ];
    const where = { AND: [base, this.stateWhere(query.etat || 'A_VERIFIER')] };
    const states = ['A_VERIFIER', 'PROPOSITIONS', 'A_DISCUTER', 'VERIFIES'];
    const [data, total, counts] = await Promise.all([
      this.db.produit.findMany({
        where,
        select: {
          ...catalogueSelect,
          propositionsCatalogue: {
            where: { statut: 'EN_ATTENTE' },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
        orderBy: [{ nomProduit: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.produit.count({ where }),
      Promise.all(
        states.map((etat) =>
          this.db.produit.count({
            where: { AND: [base, this.stateWhere(etat)] },
          }),
        ),
      ),
    ]);
    return {
      data,
      total,
      page,
      lastPage: Math.max(1, Math.ceil(total / limit)),
      counts: Object.fromEntries(states.map((key, i) => [key, counts[i]])),
    };
  }

  async equipe() {
    return this.db.adminUser.findMany({
      where: { isActive: true },
      select: { id: true, nom: true, role: true },
      orderBy: { nom: 'asc' },
    });
  }

  async detail(id: string, db: any = this.db) {
    const produit = await db.produit.findUnique({
      where: { id },
      select: catalogueSelect,
    });
    if (!produit) throw new NotFoundException('Article introuvable.');
    const [propositions, historique] = await Promise.all([
      db.catalogueProposition.findMany({
        where: { produitId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.catalogueEvenement.findMany({
        where: { produitId: id },
        select: {
          id: true,
          acteurNom: true,
          action: true,
          avant: true,
          apres: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return { produit, propositions, historique };
  }

  async mutate(id: string, dto: CatalogueMutationDto, actor: any) {
    const isProposal = ['PROPOSER', 'DISCUTER'].includes(dto.action);
    if (!isProposal && !adminRole(actor))
      throw new ForbiddenException(
        'Seul un administrateur peut prendre cette décision.',
      );
    const hash = createHash('sha256')
      .update(JSON.stringify(stable({ id, ...dto })))
      .digest('hex');
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))::text',
        `catalogue:${dto.operationId}`,
      );
      const previous = await tx.catalogueEvenement.findUnique({
        where: { operationId: dto.operationId },
      });
      if (previous) {
        if (previous.acteurId !== actor.id || previous.requeteHash !== hash)
          throw new ConflictException(
            'Cet identifiant d’envoi a déjà été utilisé.',
          );
        return previous.resultat;
      }
      await tx.$queryRawUnsafe(
        'SELECT id FROM produit WHERE id=$1 FOR UPDATE',
        id,
      );
      const before = await tx.produit.findUnique({
        where: { id },
        select: catalogueSelect,
      });
      if (!before) throw new NotFoundException('Article introuvable.');
      const subjectRevision =
        dto.sujet === 'PRIX'
          ? 'prixRevision'
          : dto.sujet === 'CLASSEMENT'
            ? 'classementRevision'
            : 'commercialRevision';
      if (
        before[subjectRevision] !== dto[subjectRevision] ||
        before.commercialRevision !== dto.commercialRevision
      ) {
        throw new ConflictException({
          message:
            'Cet article a changé. Comparez vos valeurs avec la version actuelle.',
          actuel: before,
        });
      }
      if (!before.estActif)
        throw new BadRequestException('Cet article est archivé.');
      const proposition = dto.propositionId
        ? await tx.catalogueProposition.findUnique({
            where: { id: dto.propositionId },
          })
        : null;
      if (
        ['ACCEPTER', 'REFUSER'].includes(dto.action) &&
        (!proposition ||
          proposition.produitId !== id ||
          proposition.sujet !== dto.sujet ||
          proposition.statut !== 'EN_ATTENTE')
      ) {
        throw new ConflictException(
          'Cette proposition a déjà été traitée ou ne correspond pas à cet article.',
        );
      }
      if (
        dto.action === 'ACCEPTER' &&
        (proposition[subjectRevision] !== before[subjectRevision] ||
          proposition.commercialRevision !== before.commercialRevision)
      ) {
        throw new ConflictException(
          'Cette proposition repose sur des données anciennes. Vérifiez les valeurs actuelles.',
        );
      }
      if (dto.action === 'ARCHIVER' && dto.sujet !== 'ARCHIVAGE')
        throw new BadRequestException('Le sujet doit être Archivage.');
      if (
        dto.action === 'ACCEPTER' &&
        proposition.type === 'DISCUSSION' &&
        !dto.changements
      )
        throw new BadRequestException(
          'Vérifiez les valeurs puis utilisez Modifier et valider pour résoudre la discussion.',
        );
      const changes =
        dto.changements ??
        (dto.action === 'ACCEPTER' ? proposition.changements : {});
      const data: any = this.onlySubject(dto.sujet, changes);
      if (dto.sujet === 'CLASSEMENT' && dto.action !== 'REFUSER')
        await this.validateClassification(tx, { ...before, ...data });
      if (
        dto.sujet === 'PRIX' &&
        dto.action !== 'REFUSER' &&
        !(isProposal && (dto.action === 'DISCUTER' || dto.type === 'DISCUSSION'))
      )
        validateCataloguePrices({ ...before, ...data });
      if (
        (dto.action === 'DISCUTER' || dto.type === 'DISCUSSION') &&
        !dto.commentaire?.trim()
      )
        throw new BadRequestException('Indiquez le point à discuter.');
      let proposalId: string | undefined;
      if (isProposal) {
        const created = await tx.catalogueProposition.create({
          data: {
            produitId: id,
            auteurId: actor.id,
            auteurNom: actor.nom || actor.username || actor.id,
            sujet: dto.sujet,
            type:
              dto.action === 'DISCUTER'
                ? 'DISCUSSION'
                : dto.type ||
                  (Object.keys(data).length ? 'CORRECTION' : 'CONFIRMATION'),
            commentaire: dto.commentaire?.trim() || null,
            observe: json(before),
            changements: json(data),
            prixRevision: before.prixRevision,
            classementRevision: before.classementRevision,
            commercialRevision: before.commercialRevision,
          },
        });
        proposalId = created.id;
      } else if (dto.action === 'REFUSER') {
        await tx.catalogueProposition.update({
          where: { id: proposition.id },
          data: {
            statut: 'REFUSEE',
            traiteAt: new Date(),
            traitePar: actor.id,
          },
        });
        if (dto.sujet !== 'ARCHIVAGE')
          await tx.produit.update({
            where: { id },
            data:
              dto.sujet === 'PRIX'
                ? {
                    prixVerifieRevision: null,
                    prixVerifieAt: null,
                    prixVerifiePar: null,
                  }
                : {
                    classementVerifieRevision: null,
                    classementVerifieAt: null,
                    classementVerifiePar: null,
                  },
          });
      } else {
        if (dto.sujet === 'ARCHIVAGE') {
          if (!['ARCHIVER', 'ACCEPTER'].includes(dto.action))
            throw new BadRequestException('Utilisez l’action Archiver.');
          data.estActif = false;
          data.desactiveLe = new Date();
        }
        await tx.produit.update({
          where: { id },
          data: { ...data, version: { increment: 1 } },
        });
        const updated = await tx.produit.findUnique({
          where: { id },
          select: catalogueSelect,
        });
        if (dto.sujet === 'PRIX')
          await tx.produit.update({
            where: { id },
            data: {
              prixVerifieRevision: updated.prixRevision,
              prixVerifieAt: new Date(),
              prixVerifiePar: actor.nom || actor.id,
            },
          });
        if (dto.sujet === 'CLASSEMENT')
          await tx.produit.update({
            where: { id },
            data: {
              classementVerifieRevision: updated.classementRevision,
              classementVerifieAt: new Date(),
              classementVerifiePar: actor.nom || actor.id,
            },
          });
        await tx.catalogueProposition.updateMany({
          where: { produitId: id, sujet: dto.sujet, statut: 'EN_ATTENTE' },
          data: {
            statut: 'OBSOLETE',
            traiteAt: new Date(),
            traitePar: actor.id,
          },
        });
        if (proposition)
          await tx.catalogueProposition.update({
            where: { id: proposition.id },
            data: {
              statut: 'ACCEPTEE',
              traiteAt: new Date(),
              traitePar: actor.id,
            },
          });
      }
      const after = await tx.produit.findUnique({
        where: { id },
        select: catalogueSelect,
      });
      const result = json({
        produit: after,
        propositionId: proposalId,
        operationId: dto.operationId,
      });
      await tx.catalogueEvenement.create({
        data: {
          operationId: dto.operationId,
          requeteHash: hash,
          produitId: id,
          acteurId: actor.id,
          acteurNom: actor.nom || actor.username || actor.id,
          action: `${dto.action}_${dto.sujet}`,
          avant: json(before),
          apres: json({
            ...after,
            commentaire: dto.commentaire || null,
            propositionId: proposition?.id || proposalId || null,
            changements: data,
          }),
          resultat: result,
        },
      });
      return result;
    });
  }

  private onlySubject(sujet: string, changes: CatalogueChangesDto) {
    const keys =
      sujet === 'PRIX'
        ? priceKeys
        : sujet === 'CLASSEMENT'
          ? ['categorieId', 'sousCategorieId']
          : [];
    for (const key of Object.keys(changes))
      if (!keys.includes(key))
        throw new BadRequestException(
          'Les champs proposés ne correspondent pas au sujet.',
        );
    const data: any = Object.fromEntries(
      keys
        .filter((key) => changes[key] !== undefined)
        .map((key) => [key, changes[key]]),
    );
    if (data.finPromo) data.finPromo = new Date(data.finPromo);
    return data;
  }

  private async validateClassification(tx: any, product: any) {
    if (
      !(await tx.categorie.findUnique({ where: { id: product.categorieId } }))
    )
      throw new BadRequestException('Catégorie introuvable.');
    if (product.sousCategorieId) {
      const sub = await tx.sousCategorie.findUnique({
        where: { id: product.sousCategorieId },
      });
      if (!sub || sub.categorieId !== product.categorieId)
        throw new BadRequestException(
          'La sous-catégorie doit appartenir à la catégorie choisie.',
        );
    }
  }

  async batch(dto: CatalogueBatchDto, actor: any) {
    if (!adminRole(actor)) throw new ForbiddenException();
    const results: any[] = [];
    for (const item of dto.items) {
      try {
        results.push({
          produitId: item.produitId,
          ok: true,
          resultat: await this.mutate(item.produitId, item, actor),
        });
      } catch (error: any) {
        results.push({
          produitId: item.produitId,
          ok: false,
          status: error.getStatus?.() || 500,
          message: error.message,
        });
      }
    }
    return { results };
  }

  async saveSubcategory(id: string | null, dto: SousCategorieDto) {
    const nom = dto.nom.trim();
    if (!nom) throw new BadRequestException('Indiquez un nom.');
    if (
      !(await this.db.categorie.findUnique({ where: { id: dto.categorieId } }))
    )
      throw new BadRequestException('Catégorie introuvable.');
    if (id) {
      const old = await this.db.sousCategorie.findUnique({ where: { id } });
      if (!old) throw new NotFoundException();
      if (old.categorieId !== dto.categorieId)
        throw new BadRequestException(
          'Réaffectez les produits avant de changer de catégorie parente.',
        );
    }
    try {
      return id
        ? await this.db.sousCategorie.update({ where: { id }, data: { nom } })
        : await this.db.sousCategorie.create({ data: { ...dto, nom } });
    } catch (error: any) {
      if (error.code === 'P2002')
        throw new ConflictException('Ce nom existe déjà dans cette catégorie.');
      throw error;
    }
  }

  async deleteSubcategory(id: string) {
    if (await this.db.produit.count({ where: { sousCategorieId: id } }))
      throw new ConflictException(
        'Réaffectez les produits avant de supprimer cette sous-catégorie.',
      );
    try {
      return await this.db.sousCategorie.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003')
        throw new ConflictException('Cette sous-catégorie est utilisée.');
      if (error.code === 'P2025') throw new NotFoundException();
      throw error;
    }
  }
}
