import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MethodePaiement } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { CaisseJourService } from 'src/caisse-jour/caisse-jour.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

const TICKET_VALIDITY_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class TicketVenteService {
  private readonly logger = new Logger(TicketVenteService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly caisseJour: CaisseJourService,
  ) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Génère un numéro lisible : T-YYYYMMDD-NNNN où NNNN est l'ordre du jour. */
  private async generateNumeroTicket(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const countToday = await this.db.ticketVente.count({
      where: { createdAt: { gte: startOfDay, lt: endOfDay } },
    });
    const seq = String(countToday + 1).padStart(4, '0');
    return `T-${datePart}-${seq}`;
  }

  /**
   * Crée un ticket en attente d'encaissement.
   * Vérifie le stock des produits et fige les prix actuels.
   */
  async create(vendeurId: string, dto: CreateTicketDto) {
    if (!dto.lignes || dto.lignes.length === 0) {
      throw new BadRequestException('Le ticket doit contenir au moins une ligne.');
    }

    const produitIds = dto.lignes.map((l) => l.produitId);
    const produits = await this.db.produit.findMany({
      where: { id: { in: produitIds } },
    });
    if (produits.length !== produitIds.length) {
      throw new NotFoundException('Au moins un produit est introuvable.');
    }

    const produitsById = new Map(produits.map((p) => [p.id, p]));
    let montantTotal = 0;
    const lignesData = dto.lignes.map((l) => {
      const p = produitsById.get(l.produitId)!;
      if (p.quantiteStock < l.quantite) {
        throw new BadRequestException(
          `Stock insuffisant pour ${p.nomProduit} (disponible : ${p.quantiteStock}).`,
        );
      }
      const prixUnitaire = this.toNumber(p.prixPromo ?? p.prixDetail ?? 0);
      const sousTotal = prixUnitaire * l.quantite;
      montantTotal += sousTotal;
      return {
        produitId: p.id,
        nomProduit: p.nomProduit,
        quantite: l.quantite,
        prixUnitaire,
        sousTotal,
      };
    });

    const numeroTicket = await this.generateNumeroTicket();
    const expiresAt = new Date(Date.now() + TICKET_VALIDITY_MS);

    const ticket = await this.db.ticketVente.create({
      data: {
        numeroTicket,
        vendeurId,
        clientId: dto.clientId ?? null,
        nomClient: dto.nomClient ?? null,
        telephoneClient: dto.telephoneClient ?? null,
        montantTotal,
        expiresAt,
        lignes: { create: lignesData },
      },
      include: { lignes: true },
    });

    this.notifications
      .create(
        'VENTE_CREEE',
        `Nouveau ticket ${ticket.numeroTicket} en attente — ${montantTotal} FCFA`,
      )
      .catch(() => {});

    return ticket;
  }

  /** File d'attente caissier : tickets EN_ATTENTE non expirés, ordre ancienneté. */
  async listEnAttente() {
    return this.db.ticketVente.findMany({
      where: { statut: 'EN_ATTENTE', expiresAt: { gt: new Date() } },
      include: { lignes: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Tickets d'un vendeur (tous statuts, 50 derniers). */
  async listMine(vendeurId: string) {
    return this.db.ticketVente.findMany({
      where: { vendeurId },
      include: { lignes: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Tickets du jour (tous statuts) pour ADMIN/SUPER_ADMIN. */
  async listJour() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.db.ticketVente.findMany({
      where: { createdAt: { gte: startOfDay } },
      include: { lignes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const t = await this.db.ticketVente.findUnique({
      where: { id },
      include: { lignes: true, vente: true },
    });
    if (!t) throw new NotFoundException(`Ticket ${id} introuvable.`);
    return t;
  }

  /**
   * Encaisse un ticket : crée la vente, l'opération caisse du jour, décrémente
   * le stock. Atomique via Prisma $transaction.
   */
  async encaisser(
    ticketId: string,
    caissierId: string,
    methodePaiement: MethodePaiement,
  ) {
    const ticket = await this.findOne(ticketId);
    if (ticket.statut !== 'EN_ATTENTE') {
      throw new BadRequestException(
        `Impossible d'encaisser un ticket ${ticket.statut}.`,
      );
    }
    if (ticket.expiresAt < new Date()) {
      // Marquer expiré au passage
      await this.db.ticketVente.update({
        where: { id: ticketId },
        data: { statut: 'EXPIRE' },
      });
      throw new BadRequestException('Ce ticket a expiré.');
    }

    const cj = await this.caisseJour.getOrCreateToday(caissierId);
    if (cj.statut === 'FERMEE') {
      throw new BadRequestException(
        'La caisse du jour est fermée. Encaissement impossible.',
      );
    }

    const result = await this.db.$transaction(async (tx: any) => {
      // 1. Créer la vente + lignes
      const vente = await tx.vente.create({
        data: {
          clientId: ticket.clientId ?? null,
          montantTotal: ticket.montantTotal,
          methodePaiement,
          statutPaiement: 'PAYE',
          lignesVente: {
            create: ticket.lignes.map((l) => ({
              produitId: l.produitId,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              sousTotal: l.sousTotal,
            })),
          },
        },
      });

      // 2. Décrémenter stock + mouvement
      for (const l of ticket.lignes) {
        await tx.produit.update({
          where: { id: l.produitId },
          data: { quantiteStock: { decrement: l.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            produitId: l.produitId,
            typeMouvement: 'SORTIE',
            quantite: l.quantite,
            motif: `Vente ticket ${ticket.numeroTicket}`,
          },
        });
      }

      // 3. Opération caisse du jour
      await tx.caisse.create({
        data: {
          typeOperation: 'ENTREE',
          montant: ticket.montantTotal,
          motif: `Encaissement ticket ${ticket.numeroTicket}`,
          venteId: vente.id,
          caisseJourId: cj.id,
          effectueePar: caissierId,
        },
      });

      // 4. Mettre à jour le ticket
      const updated = await tx.ticketVente.update({
        where: { id: ticketId },
        data: {
          statut: 'ENCAISSE',
          caissierId,
          methodePaiement,
          venteId: vente.id,
          encaisseAt: new Date(),
        },
        include: { lignes: true, vente: true },
      });

      return updated;
    });

    this.notifications
      .create(
        'VENTE_CREEE',
        `Ticket ${ticket.numeroTicket} encaissé — ${ticket.montantTotal} FCFA (${methodePaiement})`,
      )
      .catch(() => {});

    return result;
  }

  /**
   * Annulation par le vendeur propriétaire (uniquement si EN_ATTENTE).
   */
  async annuler(ticketId: string, demandeurId: string, motif?: string) {
    const ticket = await this.findOne(ticketId);
    if (ticket.statut !== 'EN_ATTENTE') {
      throw new BadRequestException(
        `Impossible d'annuler un ticket ${ticket.statut}.`,
      );
    }
    if (ticket.vendeurId !== demandeurId) {
      throw new ForbiddenException(
        "Seul le vendeur qui a créé le ticket peut l'annuler.",
      );
    }

    const updated = await this.db.ticketVente.update({
      where: { id: ticketId },
      data: {
        statut: 'ANNULE',
        annuleAt: new Date(),
        motifAnnulation: motif?.trim() || null,
      },
    });

    this.notifications
      .create(
        'VENTE_MAJ',
        `Ticket ${ticket.numeroTicket} annulé par le vendeur${motif ? ` — ${motif}` : ''}`,
      )
      .catch(() => {});

    return updated;
  }

  /** Marque comme EXPIRE tous les tickets EN_ATTENTE dont expiresAt est dépassé. */
  async expirerTicketsEchus() {
    const res = await this.db.ticketVente.updateMany({
      where: { statut: 'EN_ATTENTE', expiresAt: { lt: new Date() } },
      data: { statut: 'EXPIRE' },
    });
    if (res.count > 0) {
      this.logger.log(`${res.count} ticket(s) expiré(s).`);
    }
    return res.count;
  }
}
