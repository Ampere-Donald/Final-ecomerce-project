import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, MethodePaiement } from '@prisma/client';
import { BonVenteEventsService } from 'src/bon-vente/bon-vente.events.service';
import { BonVenteService } from 'src/bon-vente/bon-vente.service';
import { DatabaseService } from 'src/database/database.service';
import { CreateProformaDto, LigneProformaDto } from './dto/create-proforma.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { DocumentNumberService } from 'src/database/document-number.service';
import {
  assertTicketStockAvailable,
  inspectTicketStock,
} from 'src/ticket-vente/ticket-stock.util';

const PROFORMA_VALIDITY_DAYS = 30;
const TICKET_VALIDITY_MS = 15 * 60 * 1000;

type Actor = { id: string; role: string };

@Injectable()
export class ProformaService {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: BonVenteEventsService,
    private readonly bonVente: BonVenteService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private canManageAll(role: string) {
    return ['SUPER_ADMIN', 'ADMIN'].includes(role);
  }

  private canReadAll(role: string) {
    return ['SUPER_ADMIN', 'ADMIN', 'CAISSIER'].includes(role);
  }

  private include() {
    return {
      lignes: true,
      client: true,
      vendeur: { select: { id: true, nom: true, username: true, role: true } },
    };
  }

  private async generateNumero(tx?: any): Promise<string> {
    return this.documentNumbers.nextAnnual('PROFORMA', 'FP-', tx);
  }

  private dateExpiration() {
    const d = new Date();
    d.setDate(d.getDate() + PROFORMA_VALIDITY_DAYS);
    return d;
  }

  private async buildLignes(lignes: LigneProformaDto[], db: any = this.db) {
    if (!Array.isArray(lignes) || !lignes.length || lignes.length > 100) {
      throw new BadRequestException(
        'La proforma doit contenir de 1 à 100 références.',
      );
    }
    const produitIds = lignes.map((line) => line.produitId);
    if (
      produitIds.some((id) => !id) ||
      new Set(produitIds).size !== produitIds.length
    ) {
      throw new BadRequestException(
        'Chaque ligne doit désigner une référence distincte du catalogue.',
      );
    }
    const produits = await db.produit.findMany({
      where: { id: { in: produitIds }, estActif: true },
      select: { id: true, nomProduit: true },
    });
    if (produits.length !== produitIds.length) {
      throw new NotFoundException(
        'Au moins un produit est introuvable ou a quitté le catalogue.',
      );
    }

    const produitsById = new Map<string, { id: string; nomProduit: string }>(
      produits.map((product) => [product.id, product]),
    );
    let totalCents = 0;
    const lignesData = lignes.map((line) => {
      const produit = produitsById.get(line.produitId)!;
      // Le prix reste le montant explicitement autorisé pour cette proforma.
      const price = Number(line.prixUnitaire);
      const cents = Math.round(price * 100);
      const sousTotalCents = cents * line.quantite;
      if (
        !Number.isSafeInteger(line.quantite) ||
        line.quantite < 1 ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isSafeInteger(cents) ||
        cents > 9999999999 ||
        !Number.isSafeInteger(sousTotalCents) ||
        sousTotalCents > 999999999999
      ) {
        throw new BadRequestException(
          'Vérifiez les quantités et les montants de la proforma.',
        );
      }
      totalCents += sousTotalCents;
      if (!Number.isSafeInteger(totalCents) || totalCents > 999999999999) {
        throw new BadRequestException(
          'Le total de la proforma dépasse le montant accepté.',
        );
      }
      return {
        produitId: produit.id,
        nomProduit: produit.nomProduit,
        quantite: line.quantite,
        prixUnitaire: cents / 100,
        sousTotal: sousTotalCents / 100,
      };
    });
    return { lignesData, montantTotal: totalCents / 100 };
  }

  async create(vendeurId: string, dto: CreateProformaDto, tx: any = this.db) {
    const { lignesData, montantTotal } = await this.buildLignes(dto.lignes, tx);
    return tx.proforma.create({
      data: {
        numero: await this.generateNumero(tx),
        vendeurId,
        clientId: dto.clientId ?? null,
        clientNom: dto.clientNom?.trim() || null,
        clientNiu: dto.clientNiu?.trim() || null,
        clientRccm: dto.clientRccm?.trim() || null,
        notes: dto.notes?.trim() || null,
        dateExpiration: this.dateExpiration(),
        montantTotal,
        lignes: { create: lignesData },
      },
      include: this.include(),
    });
  }

  async findAll(actor: Actor, filters: { statut?: string; periode?: string }) {
    const where: any = {};
    if (!this.canReadAll(actor.role)) where.vendeurId = actor.id;
    if (filters.statut) where.statut = filters.statut;
    if (filters.periode) {
      const [year, month] = filters.periode.split('-').map(Number);
      if (year && month) {
        where.dateCreation = {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        };
      }
    }
    return this.db.proforma.findMany({
      where,
      include: this.include(),
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(id: string, actor: Actor) {
    const proforma = await this.db.proforma.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!proforma) throw new NotFoundException('Proforma introuvable.');
    if (!this.canReadAll(actor.role) && proforma.vendeurId !== actor.id) {
      throw new ForbiddenException('Acces refuse a cette proforma.');
    }
    return proforma;
  }

  private async mutableProforma(tx: any, id: string, actor: Actor) {
    const current = await tx.proforma.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!current) throw new NotFoundException('Proforma introuvable.');
    if (
      !this.canManageAll(actor.role) &&
      (actor.role !== 'VENDEUR' || current.vendeurId !== actor.id)
    ) {
      throw new ForbiddenException('Accès refusé à cette proforma.');
    }
    if (current.statut !== 'EN_COURS') {
      throw new ConflictException(
        'Cette proforma n’est plus en cours. Actualisez-la.',
      );
    }
    if (current.dateExpiration.getTime() <= Date.now()) {
      throw new ConflictException('Cette proforma a expiré.');
    }
    return current;
  }

  private concurrentMutation(error: any): never {
    if (error?.code === 'P2034') {
      throw new ConflictException(
        'Cette proforma a changé pendant l’opération. Actualisez-la avant de réessayer.',
      );
    }
    throw error;
  }

  async update(id: string, actor: Actor, dto: UpdateProformaDto) {
    try {
      return await this.db.$transaction(
        async (tx: any) => {
          const current = await this.mutableProforma(tx, id, actor);
          const { lignesData, montantTotal } = await this.buildLignes(
            dto.lignes ?? current.lignes,
            tx,
          );
          const data = {
            clientId: dto.clientId ?? current.clientId,
            clientNom:
              dto.clientNom !== undefined
                ? dto.clientNom?.trim() || null
                : current.clientNom,
            clientNiu:
              dto.clientNiu !== undefined
                ? dto.clientNiu?.trim() || null
                : current.clientNiu,
            clientRccm:
              dto.clientRccm !== undefined
                ? dto.clientRccm?.trim() || null
                : current.clientRccm,
            notes:
              dto.notes !== undefined
                ? dto.notes?.trim() || null
                : current.notes,
            ...(dto.lignes ? { montantTotal } : {}),
          };
          // The row claim shares the transaction with replacement of all lines.
          const changed = await tx.proforma.updateMany({
            where: {
              id,
              statut: 'EN_COURS',
              dateExpiration: { gt: new Date() },
            },
            data,
          });
          if (changed.count !== 1)
            throw new ConflictException(
              'Cette proforma a changé. Actualisez-la.',
            );
          if (dto.lignes) {
            await tx.proformaLigne.deleteMany({ where: { proformaId: id } });
            await tx.proformaLigne.createMany({
              data: lignesData.map((line) => ({ ...line, proformaId: id })),
            });
          }
          return tx.proforma.findUniqueOrThrow({
            where: { id },
            include: this.include(),
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.concurrentMutation(error);
    }
  }

  async transformer(
    id: string,
    actor: Actor,
    methodePaiement: MethodePaiement,
  ) {
    let result: any;
    try {
      result = await this.db.$transaction(
        async (tx: any) => {
          const proforma = await this.mutableProforma(tx, id, actor);
          const { lignesData, montantTotal } = await this.buildLignes(
            proforma.lignes,
            tx,
          );
          if (
            Math.round(Number(proforma.montantTotal) * 100) !==
              Math.round(montantTotal * 100) ||
            proforma.lignes.some(
              (line, index) =>
                Math.round(Number(line.sousTotal) * 100) !==
                Math.round(lignesData[index].sousTotal * 100),
            )
          ) {
            throw new BadRequestException(
              'Le total de la proforma ne correspond pas à ses lignes.',
            );
          }
          // Claim the proforma before taking stock locks, matching quote acceptance.
          // A failed stock check rolls this claim back with the rest of the transaction.
          const changed = await tx.proforma.updateMany({
            where: {
              id,
              statut: 'EN_COURS',
              dateExpiration: { gt: new Date() },
            },
            data: { statut: 'TRANSFORMEE' },
          });
          if (changed.count !== 1)
            throw new ConflictException(
              'Cette proforma a changé. Actualisez-la.',
            );
          const availability = await inspectTicketStock(tx, lignesData, {
            lock: true,
          });
          assertTicketStockAvailable(availability);
          if (proforma.dateExpiration.getTime() <= Date.now())
            throw new ConflictException('Cette proforma a expiré.');
          const ticket = await tx.ticketVente.create({
            data: {
              numeroTicket: await this.bonVente.generateNumeroTicket(tx),
              vendeurId: proforma.vendeurId,
              clientId: proforma.clientId,
              nomClient: proforma.clientNom,
              montantTotal: proforma.montantTotal,
              methodePaiement,
              expiresAt: new Date(Date.now() + TICKET_VALIDITY_MS),
              lignes: {
                create: proforma.lignes.map((line) => ({
                  produitId: line.produitId,
                  nomProduit: line.nomProduit,
                  quantite: line.quantite,
                  prixUnitaire: line.prixUnitaire,
                  sousTotal: line.sousTotal,
                })),
              },
            },
            include: { lignes: true },
          });
          const updated = await tx.proforma.findUniqueOrThrow({
            where: { id },
            include: this.include(),
          });
          return { proforma: updated, ticket };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.concurrentMutation(error);
    }
    this.events.emit(result.ticket);
    return result;
  }

  async remove(id: string) {
    const proforma = await this.db.proforma.findUnique({ where: { id } });
    if (!proforma) throw new NotFoundException('Proforma introuvable.');
    await this.db.proforma.delete({ where: { id } });
    return { deleted: true };
  }

  @Cron('0 2 * * *', { timeZone: 'Africa/Douala' })
  async deleteExpired() {
    return this.db.proforma.deleteMany({
      where: {
        dateExpiration: { lt: new Date() },
        statut: { not: 'TRANSFORMEE' },
      },
    });
  }
}
