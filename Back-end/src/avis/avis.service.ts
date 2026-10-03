import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, StatutAvis } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import {
  AVIS_MOTIFS,
  CreateAvisDto,
  ModererAvisDto,
  SignalerAvisDto,
} from './avis.dto';

const publicSelect = {
  id: true,
  note: true,
  texte: true,
  pseudonyme: true,
  projetRealise: true,
  createdAt: true,
  reponseBoutique: true,
} satisfies Prisma.AvisProduitSelect;
const privateSelect = {
  ...publicSelect,
  statut: true,
  version: true,
  ligneCommandeId: true,
};
const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function avisContent(dto: CreateAvisDto) {
  const texte = text(dto.texte, 10, 2000),
    pseudonyme = text(dto.pseudonyme, 2, 40);
  const projetRealise = dto.projetRealise?.trim()
    ? text(dto.projetRealise, 1, 300)
    : null;
  if (!Number.isInteger(dto.note) || dto.note < 1 || dto.note > 5)
    throw new BadRequestException('Note attendue entre 1 et 5.');
  return { note: dto.note, texte, pseudonyme, projetRealise };
}
function text(value: string, min: number, max: number) {
  if (typeof value !== 'string')
    throw new BadRequestException('Texte invalide.');
  const normalized = value.trim();
  if (
    normalized.length < min ||
    normalized.length > max ||
    [...normalized].some((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
    })
  )
    throw new BadRequestException(
      'Texte vide, trop court, trop long ou caractères invalides.',
    );
  return normalized;
}
export function avisPage(
  value: string | undefined,
  fallback: number,
  maximum: number,
) {
  if (value === undefined) return fallback;
  if (
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > maximum
  )
    throw new BadRequestException('Pagination invalide.');
  return Number(value);
}

@Injectable()
export class AvisService {
  constructor(private readonly db: DatabaseService) {}

  async publicList(produitId: string, pageValue?: string, limitValue?: string) {
    const page = avisPage(pageValue, 1, 10000),
      limit = avisPage(limitValue, 10, 30);
    return this.db.$transaction(
      async (tx) => {
        const product = await tx.produit.findFirst({
          where: { id: produitId, estActif: true },
          select: { id: true },
        });
        if (!product) throw new NotFoundException('Article introuvable.');
        const where: Prisma.AvisProduitWhereInput = {
          statut: 'PUBLIE',
          ligne: {
            produitId,
            commande: { statut: 'LIVREE', dateLivraison: { not: null } },
          },
        };
        const summary = await tx.avisProduit.aggregate({
          where,
          _count: { _all: true },
          _avg: { note: true },
        });
        const items = await tx.avisProduit.findMany({
          where,
          select: publicSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        return {
          total: summary._count._all,
          moyenne: summary._avg.note,
          page,
          limit,
          items: items.map((item) => ({ ...item, achatVerifie: true })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async purchaseLines(clientId: string, commandeId: string) {
    const order = await this.db.commande.findFirst({
      where: { id: commandeId, clientId },
      select: {
        statut: true,
        dateLivraison: true,
        lignes: {
          select: {
            id: true,
            nomProduit: true,
            produitId: true,
            avis: { select: privateSelect },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    return {
      eligible: order.statut === 'LIVREE' && !!order.dateLivraison,
      lignes: order.lignes,
    };
  }

  async create(clientId: string, dto: CreateAvisDto) {
    const content = avisContent(dto);
    const signature = fingerprint({
      clientId,
      ligneCommandeId: dto.ligneCommandeId,
      ...content,
    });
    return this.db.$transaction(async (tx) => {
      const line = await tx.ligneCommande.findUnique({
        where: { id: dto.ligneCommandeId },
        select: { commandeId: true },
      });
      if (!line) throw new NotFoundException('Achat introuvable.');
      await tx.$queryRaw`SELECT id FROM commande WHERE id = ${line.commandeId} FOR UPDATE`;
      const order = await tx.commande.findUnique({
        where: { id: line.commandeId },
        select: {
          clientId: true,
          statut: true,
          dateLivraison: true,
        },
      });
      // Recheck ownership inside the same lock used by linking/order transitions.
      if (!order || order.clientId !== clientId)
        throw new NotFoundException('Achat introuvable.');
      const replay = await tx.avisProduit.findUnique({
        where: { requestId: dto.requestId },
      });
      if (replay) {
        if (replay.fingerprint !== signature)
          throw new ConflictException(
            'Tentative déjà utilisée avec un autre contenu.',
          );
        return { id: replay.id, enregistre: true };
      }
      if (order.statut !== 'LIVREE' || !order.dateLivraison)
        throw new ConflictException(
          'Un avis est possible après réception de la commande.',
        );
      if (
        await tx.avisProduit.findUnique({
          where: { ligneCommandeId: dto.ligneCommandeId },
        })
      )
        throw new ConflictException(
          'Un avis est déjà enregistré pour cet article acheté.',
        );
      try {
        const review = await tx.avisProduit.create({
          data: {
            ligneCommandeId: dto.ligneCommandeId,
            requestId: dto.requestId,
            fingerprint: signature,
            ...content,
          },
          select: { id: true },
        });
        return { id: review.id, enregistre: true };
      } catch (error) {
        if ((error as { code?: string })?.code === 'P2002')
          throw new ConflictException('Tentative ou avis déjà enregistré.');
        throw error;
      }
    });
  }

  async adminList(stateValue?: string, pageValue?: string) {
    const statut = stateValue || 'EN_ATTENTE';
    if (!Object.values(StatutAvis).includes(statut as StatutAvis))
      throw new BadRequestException('État invalide.');
    const page = avisPage(pageValue, 1, 10000);
    return this.db.avisProduit.findMany({
      where: { statut: statut as StatutAvis },
      select: {
        ...privateSelect,
        ligne: { select: { nomProduit: true } },
        _count: { select: { signalements: true } },
        historique: {
          select: { action: true, motif: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        signalements: {
          select: { motif: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 30,
      skip: (page - 1) * 30,
    });
  }

  async moderate(actorId: string, id: string, dto: ModererAvisDto) {
    if (!['PUBLIER', 'REFUSER', 'REPONDRE'].includes(dto.action))
      throw new BadRequestException('Action invalide.');
    if (dto.action === 'REFUSER' && !AVIS_MOTIFS.includes(dto.motif!))
      throw new BadRequestException(
        'Un motif de contenu est obligatoire. Une note négative ne justifie pas un refus.',
      );
    if (dto.action !== 'REFUSER' && dto.motif)
      throw new BadRequestException('Motif incompatible avec cette action.');
    if (dto.action !== 'REPONDRE' && dto.reponse !== undefined)
      throw new BadRequestException('Réponse incompatible avec cette action.');
    const reponse =
      dto.action === 'REPONDRE' ? text(dto.reponse!, 2, 1000) : null;
    const signature = fingerprint({ actorId, id, ...dto, reponse });
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM avis_produit WHERE id = ${id}::uuid FOR UPDATE`;
        const replay = await tx.avisModeration.findUnique({
          where: { requestId: dto.requestId },
        });
        if (replay) {
          if (replay.fingerprint !== signature)
            throw new ConflictException(
              'Tentative de modération déjà utilisée.',
            );
          return replay.resultat;
        }
        const review = await tx.avisProduit.findUnique({ where: { id } });
        if (!review) throw new NotFoundException('Avis introuvable.');
        if (review.version !== dto.expectedVersion)
          throw new ConflictException('Avis modifié. Actualisez la liste.');
        if (dto.action === 'REPONDRE' && review.statut !== 'PUBLIE')
          throw new ConflictException('Publiez l’avis avant de répondre.');
        const result = await tx.avisProduit.update({
          where: { id },
          data: {
            ...(dto.action === 'REPONDRE'
              ? { reponseBoutique: reponse }
              : { statut: dto.action === 'PUBLIER' ? 'PUBLIE' : 'REFUSE' }),
            version: { increment: 1 },
          },
          select: { id: true, statut: true, version: true },
        });
        // Audit and change commit together; no physical deletion of a negative review.
        await tx.avisModeration.create({
          data: {
            requestId: dto.requestId,
            avisId: id,
            acteurId: actorId,
            fingerprint: signature,
            action: dto.action,
            motif: dto.motif || null,
            resultat: result,
          },
        });
        return result;
      })
      .catch((error: { code?: string }) => {
        if (error?.code === 'P2002')
          throw new ConflictException('Tentative de modération déjà utilisée.');
        throw error;
      });
  }

  async report(clientId: string, id: string, dto: SignalerAvisDto) {
    if (!AVIS_MOTIFS.includes(dto.motif))
      throw new BadRequestException('Motif invalide.');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM avis_produit WHERE id = ${id}::uuid FOR UPDATE`;
      const review = await tx.avisProduit.findUnique({
        where: { id },
        select: { statut: true },
      });
      if (!review || review.statut !== 'PUBLIE')
        throw new NotFoundException('Avis introuvable.');
      await tx.avisSignalement.upsert({
        where: { avisId_clientId: { avisId: id, clientId } },
        create: { avisId: id, clientId, motif: dto.motif },
        update: {},
      });
      // Reports never remove a review automatically, including coordinated reports.
      return { enregistre: true };
    });
  }
}
