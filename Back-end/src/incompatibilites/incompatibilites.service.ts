import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, StatutIncompatibilite } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import {
  CreateIncompatibiliteDto,
  DecisionIncompatibiliteDto,
  MOTIFS_INCOMPATIBILITE,
} from './incompatibilites.dto';

export const dossierSelect = {
  id: true,
  ligneCommandeId: true,
  quantite: true,
  motif: true,
  description: true,
  statut: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  reponseBoutique: true,
  retourQuantite: true,
  retourConfirmeAt: true,
  diagnostic: true,
} satisfies Prisma.DossierIncompatibiliteSelect;
export const incompatibiliteHash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function privateText(value: string, min: number, max: number) {
  if (typeof value !== 'string')
    throw new BadRequestException('Texte invalide.');
  const text = value.trim();
  if (
    text.length < min ||
    text.length > max ||
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)
  )
    throw new BadRequestException(
      'Texte trop court, trop long ou caractères invalides.',
    );
  return text;
}
export function incompatibiliteContent(dto: CreateIncompatibiliteDto) {
  if (
    !Number.isSafeInteger(dto.quantite) ||
    dto.quantite < 1 ||
    dto.quantite > 1000000 ||
    !MOTIFS_INCOMPATIBILITE.includes(dto.motif)
  )
    throw new BadRequestException('Quantité ou motif invalide.');
  return {
    quantite: dto.quantite,
    motif: dto.motif,
    description: privateText(dto.description, 10, 2000),
  };
}
function pageNumber(value?: string) {
  if (value === undefined) return 1;
  if (
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > 10000
  )
    throw new BadRequestException('Page invalide.');
  return Number(value);
}
@Injectable()
export class IncompatibilitesService {
  constructor(private readonly db: DatabaseService) {}
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
            quantite: true,
            incompatibilite: { select: dossierSelect },
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
  async create(clientId: string, dto: CreateIncompatibiliteDto) {
    const signature = incompatibiliteHash({
      clientId,
      ligneCommandeId: dto.ligneCommandeId,
      ...incompatibiliteContent(dto),
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
        select: { clientId: true, statut: true, dateLivraison: true },
      });
      if (!order || order.clientId !== clientId)
        throw new NotFoundException('Achat introuvable.');
      const replay = await tx.dossierIncompatibilite.findUnique({
        where: { requestId: dto.requestId },
      });
      if (replay) return this.creationReceipt(replay, signature);
      if (order.statut !== 'LIVREE' || !order.dateLivraison)
        throw new ConflictException(
          'Le signalement concerne uniquement un article reçu.',
        );
      return this.storeVerified(tx, dto, signature);
    });
  }
  private creationReceipt(
    dossier: { id: string; fingerprint: string },
    signature: string,
  ) {
    if (dossier.fingerprint !== signature)
      throw new ConflictException(
        'Tentative déjà utilisée avec un autre contenu.',
      );
    return { id: dossier.id, enregistre: true };
  }
  /** Internal: order ownership/receipt is already checked under the order lock. */
  async storeVerified(
    tx: Prisma.TransactionClient,
    dto: CreateIncompatibiliteDto,
    signature: string,
  ) {
    const replay = await tx.dossierIncompatibilite.findUnique({
      where: { requestId: dto.requestId },
    });
    if (replay) return this.creationReceipt(replay, signature);
    const line = await tx.ligneCommande.findUnique({
      where: { id: dto.ligneCommandeId },
      select: { quantite: true, incompatibilite: { select: { id: true } } },
    });
    if (!line || dto.quantite > line.quantite)
      throw new ConflictException(
        'Quantité supérieure à celle de cet achat. Actualisez le suivi.',
      );
    if (line.incompatibilite)
      throw new ConflictException(
        'Un dossier existe déjà pour cet article reçu. Consultez son suivi.',
      );
    try {
      const dossier = await tx.dossierIncompatibilite.create({
        data: {
          ligneCommandeId: dto.ligneCommandeId,
          requestId: dto.requestId,
          fingerprint: signature,
          ...incompatibiliteContent(dto),
        },
        select: { id: true },
      });
      return { id: dossier.id, enregistre: true };
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002')
        throw new ConflictException('Dossier ou tentative déjà enregistré.');
      throw error;
    }
  }
  async adminList(statut?: string, pageValue?: string) {
    if (
      statut &&
      !Object.values(StatutIncompatibilite).includes(
        statut as StatutIncompatibilite,
      )
    )
      throw new BadRequestException('État invalide.');
    const page = pageNumber(pageValue),
      where: Prisma.DossierIncompatibiliteWhereInput = statut
        ? { statut: statut as StatutIncompatibilite }
        : {};
    return this.db.$transaction(
      async (tx) => ({
        page,
        total: await tx.dossierIncompatibilite.count({ where }),
        items: await tx.dossierIncompatibilite.findMany({
          where,
          select: {
            ...dossierSelect,
            ligne: {
              select: {
                nomProduit: true,
                quantite: true,
                commande: {
                  select: { id: true, numeroSuivi: true, dateLivraison: true },
                },
              },
            },
            historique: {
              select: { action: true, reponse: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 30,
            },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 30,
          skip: (page - 1) * 30,
        }),
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async decide(actorId: string, id: string, dto: DecisionIncompatibiliteDto) {
    const reponse = privateText(dto.reponse, 10, 1000);
    if (
      ![
        'EN_EXAMEN',
        'RESOLU_SANS_RETOUR',
        'CLOTURE',
        'RETOUR_CONFIRME',
      ].includes(dto.action)
    )
      throw new BadRequestException('Action invalide.');
    if (
      dto.action === 'RETOUR_CONFIRME'
        ? !Number.isSafeInteger(dto.retourQuantite) ||
          dto.retourQuantite! < 1 ||
          !MOTIFS_INCOMPATIBILITE.includes(dto.diagnostic!)
        : dto.retourQuantite !== undefined || dto.diagnostic !== undefined
    )
      throw new BadRequestException(
        'Quantité et diagnostic requis uniquement pour un retour confirmé.',
      );
    const signature = incompatibiliteHash({
      actorId,
      id,
      requestId: dto.requestId,
      expectedVersion: dto.expectedVersion,
      action: dto.action,
      reponse,
      retourQuantite: dto.retourQuantite ?? null,
      diagnostic: dto.diagnostic ?? null,
    });
    return this.db
      .$transaction(async (tx) => {
        const initial = await tx.dossierIncompatibilite.findUnique({
          where: { id },
          select: { ligne: { select: { commandeId: true } } },
        });
        if (!initial) throw new NotFoundException('Dossier introuvable.');
        await tx.$queryRaw`SELECT id FROM commande WHERE id = ${initial.ligne.commandeId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM dossier_incompatibilite WHERE id = ${id}::uuid FOR UPDATE`;
        const replay = await tx.incompatibiliteDecision.findUnique({
          where: { requestId: dto.requestId },
        });
        if (replay) {
          if (replay.fingerprint !== signature)
            throw new ConflictException('Tentative de décision déjà utilisée.');
          return replay.resultat;
        }
        const dossier = await tx.dossierIncompatibilite.findUnique({
          where: { id },
          include: {
            ligne: {
              select: {
                quantite: true,
                commande: { select: { statut: true, dateLivraison: true } },
              },
            },
          },
        });
        if (!dossier || dossier.version !== dto.expectedVersion)
          throw new ConflictException(
            'Dossier modifié. Actualisez sa lecture.',
          );
        if (!['SIGNALE', 'EN_EXAMEN'].includes(dossier.statut))
          throw new ConflictException(
            'Ce dossier est terminé. Son historique reste consultable.',
          );
        if (
          dossier.ligne.commande.statut !== 'LIVREE' ||
          !dossier.ligne.commande.dateLivraison
        )
          throw new ConflictException(
            'La preuve de réception a changé. Vérifiez la commande.',
          );
        if (
          dto.action === 'RETOUR_CONFIRME' &&
          (dto.retourQuantite! > dossier.quantite ||
            dto.retourQuantite! > dossier.ligne.quantite)
        )
          throw new BadRequestException(
            'Quantité retournée supérieure aux pièces signalées ou achetées.',
          );
        const result = await tx.dossierIncompatibilite.update({
          where: { id },
          data: {
            statut: dto.action,
            reponseBoutique: reponse,
            version: { increment: 1 },
            ...(dto.action === 'RETOUR_CONFIRME'
              ? {
                  retourQuantite: dto.retourQuantite,
                  retourConfirmeAt: new Date(),
                  diagnostic: dto.diagnostic,
                }
              : {}),
          },
          select: { id: true, statut: true, version: true },
        });
        await tx.incompatibiliteDecision.create({
          data: {
            requestId: dto.requestId,
            dossierId: id,
            acteurId: actorId,
            fingerprint: signature,
            action: dto.action,
            reponse,
            resultat: result,
          },
        });
        return result;
      })
      .catch((error: { code?: string }) => {
        if (error?.code === 'P2002')
          throw new ConflictException('Tentative de décision déjà utilisée.');
        throw error;
      });
  }
}
