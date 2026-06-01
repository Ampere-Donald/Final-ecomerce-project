import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MethodePaiement } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationActor } from 'src/notification/notification.service';
import { TicketVenteService } from 'src/ticket-vente/ticket-vente.service';
import { BonVenteEventsService } from './bon-vente.events.service';
import { CreateBonDto } from './dto/create-bon.dto';

const TVA_TAUX = 0.1925;
const TICKET_VALIDITY_MS = 15 * 60 * 1000;

@Injectable()
export class BonVenteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: BonVenteEventsService,
    private readonly ticketService: TicketVenteService,
  ) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * Vendeur crée un bon de vente (ticket) en attente d'encaissement.
   * Stocke la méthode de paiement choisie par le vendeur sur le ticket.
   * Émet un événement SSE pour les caissiers connectés.
   */
  async create(dto: CreateBonDto, actor: NotificationActor) {
    if (!dto.lignes?.length) {
      throw new BadRequestException('Le bon doit contenir au moins une ligne');
    }

    // Vérifier qu'aucun bon EN_ATTENTE n'existe pour ce vendeur
    const pending = await this.db.ticketVente.findFirst({
      where: { vendeurId: actor.id, statut: 'EN_ATTENTE' },
      select: { id: true, numeroTicket: true },
    });
    if (pending) {
      throw new BadRequestException(
        `Un bon est déjà en attente pour ce vendeur (${pending.numeroTicket})`,
      );
    }

    // Charger les produits et calculer les prix depuis la base
    const produitIds = dto.lignes.map((l) => l.produitId);
    const produits = await this.db.produit.findMany({
      where: { id: { in: produitIds } },
    });
    if (produits.length !== produitIds.length) {
      throw new NotFoundException('Au moins un produit est introuvable');
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
        vendeurId: actor.id,
        clientId: dto.clientId ?? null,
        montantTotal,
        methodePaiement: dto.methodePaiement,
        expiresAt,
        lignes: { create: lignesData },
      },
      include: { lignes: true },
    });

    this.events.emit(ticket);
    return ticket;
  }

  /** File d'attente caissier : tickets EN_ATTENTE non expirés */
  findPending() {
    return this.db.ticketVente.findMany({
      where: { statut: 'EN_ATTENTE', expiresAt: { gt: new Date() } },
      include: { lignes: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Tous les tickets du vendeur (tous statuts, 50 derniers) */
  findMesBons(vendeurId: string) {
    return this.db.ticketVente.findMany({
      where: { vendeurId },
      include: { lignes: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Caissier valide un ticket :
   * 1. Encaisse via TicketVenteService (Vente + stock + Caisse — atomique)
   * 2. Crée la Facture avec TVA 19,25 %
   * 3. Met à jour la PrimeVendeur du mois
   */
  async valider(ticketId: string, actor: NotificationActor) {
    // Récupérer le ticket avant encaissement (pour les lignes et vendeurId)
    const ticket = await this.ticketService.findOne(ticketId);

    const methodePaiement: MethodePaiement =
      (ticket.methodePaiement as MethodePaiement) ?? 'ESPECES';

    // Encaissement atomique via TicketVenteService (gère CaisseJour)
    const encaisse = await this.ticketService.encaisser(
      ticketId,
      actor.id,
      methodePaiement,
    );

    // Créer la Facture (hors transaction initiale — données d'audit)
    const totalTTC = this.toNumber(ticket.montantTotal);
    const totalHT = totalTTC / (1 + TVA_TAUX);
    const tva = totalTTC - totalHT;
    const numeroFacture = await this.genererNumeroFacture('TICKET_CAISSE');

    const facture = await this.db.facture.create({
      data: {
        numero: numeroFacture,
        type: 'TICKET_CAISSE',
        ticketId,
        venteId: encaisse.venteId!,
        clientId: encaisse.clientId ?? undefined,
        vendeurId: ticket.vendeurId,
        caissierId: actor.id,
        totalHT,
        tva,
        totalTTC,
        methodePaiement,
        lignes: {
          create: ticket.lignes.map((l) => {
            const priceTTC = this.toNumber(l.prixUnitaire);
            const priceHT = priceTTC / (1 + TVA_TAUX);
            const stTTC = this.toNumber(l.sousTotal);
            const stHT = stTTC / (1 + TVA_TAUX);
            return {
              nomProduit: l.nomProduit,
              quantite: l.quantite,
              prixUnitaireHT: priceHT,
              prixUnitaireTTC: priceTTC,
              sousTotalHT: stHT,
              sousTotalTTC: stTTC,
            };
          }),
        },
      },
      include: {
        vendeur: { select: { id: true, nom: true, email: true, role: true } },
        caissier: { select: { id: true, nom: true, email: true, role: true } },
        client: true,
        lignes: true,
        vente: true,
      },
    });

    // Mettre à jour la prime du vendeur pour le mois en cours
    const periode = this.getPeriode(new Date());
    await this.db.primeVendeur.upsert({
      where: {
        vendeurId_periode: { vendeurId: ticket.vendeurId, periode },
      },
      create: { vendeurId: ticket.vendeurId, periode, nombreTickets: 1 },
      update: { nombreTickets: { increment: 1 } },
    });

    return { bon: encaisse, facture };
  }

  /**
   * Vendeur annule son propre bon EN_ATTENTE.
   */
  async annuler(ticketId: string, actor: NotificationActor) {
    const ticket = await this.ticketService.findOne(ticketId);
    if (ticket.vendeurId !== actor.id) {
      throw new ForbiddenException(
        'Vous ne pouvez annuler que vos propres bons',
      );
    }
    if (ticket.statut !== 'EN_ATTENTE') {
      throw new BadRequestException('Seul un bon en attente peut être annulé');
    }
    return this.ticketService.annuler(ticketId, actor.id);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async generateNumeroTicket(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const countToday = await this.db.ticketVente.count({
      where: { createdAt: { gte: startOfDay, lt: endOfDay } },
    });
    return `T-${datePart}-${String(countToday + 1).padStart(4, '0')}`;
  }

  private async genererNumeroFacture(
    type: 'FACTURE' | 'TICKET_CAISSE',
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === 'TICKET_CAISSE' ? `TIC-${year}-` : `FAC-${year}-`;
    const count = await this.db.facture.count({
      where: { numero: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private getPeriode(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
