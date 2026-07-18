import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, MethodePaiement } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import {
  NotificationActor,
  NotificationService,
} from 'src/notification/notification.service';
import { TicketVenteService } from 'src/ticket-vente/ticket-vente.service';
import { BonVenteEventsService } from './bon-vente.events.service';
import { CreateBonDto } from './dto/create-bon.dto';
import { EncaisserTicketDto } from 'src/ticket-vente/dto/encaisser-ticket.dto';
import { validerLignePrix } from 'src/pricing/pricing.util';
import { DocumentNumberService } from 'src/database/document-number.service';

const TICKET_VALIDITY_MS = 15 * 60 * 1000;

@Injectable()
export class BonVenteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: BonVenteEventsService,
    private readonly ticketService: TicketVenteService,
    private readonly notifications: NotificationService,
    private readonly documentNumbers: DocumentNumberService,
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
    if (dto.idempotencyKey) {
      const existing = await this.db.ticketVente.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { lignes: true },
      });
      if (existing) return existing;
    }
    if (!dto.lignes?.length) {
      throw new BadRequestException('Le bon doit contenir au moins une ligne');
    }

    // Charger les produits et calculer les prix depuis la base
    const produitIds = dto.lignes.map((l) => l.produitId);
    const produits = await this.db.produit.findMany({
      where: { id: { in: produitIds } },
    });
    if (produits.length !== produitIds.length) {
      throw new NotFoundException('Au moins un produit est introuvable');
    }

    // Autorisation de l'acteur (flag chargé depuis la base, rôle faisant foi)
    const acteur = await this.db.adminUser.findUnique({
      where: { id: actor.id },
      select: { role: true, peutVendreSousDemiGros: true },
    });
    const role = acteur?.role ?? actor.role;
    const peutVendreSousDemiGros = acteur?.peutVendreSousDemiGros ?? false;

    const produitsById = new Map(produits.map((p) => [p.id, p]));
    let montantTotal = 0;
    const ventesAPerte: { nom: string; prix: number; cmup: number }[] = [];
    const lignesData = dto.lignes.map((l) => {
      const p = produitsById.get(l.produitId)!;
      if (p.quantiteStock < l.quantite) {
        throw new BadRequestException(
          `Stock insuffisant pour ${p.nomProduit} (disponible : ${p.quantiteStock}).`,
        );
      }
      // prixPromo = 0 doit être ignoré (pas de promo), seule une valeur > 0 est valide
      const promoValide = p.prixPromo && this.toNumber(p.prixPromo) > 0 ? p.prixPromo : null;
      // Prix saisi par le vendeur, sinon prix promo/référence du produit
      const prixUnitaire =
        l.prixUnitaire != null && l.prixUnitaire > 0
          ? this.toNumber(l.prixUnitaire)
          : this.toNumber(promoValide ?? p.prixDetail ?? 0);

      const produitPrix = {
        prixGros: p.prixGros,
        prixDemiGros: p.prixDemiGros,
        prixDetail: p.prixDetail,
        cmupActuel: this.toNumber(p.cmupActuel),
        nomProduit: p.nomProduit,
      };
      const audit = validerLignePrix({
        produit: produitPrix,
        prix: prixUnitaire,
        role,
        peutVendreSousDemiGros,
        motif: l.motifRemise,
      });
      if (audit.bandePrix === 'PERTE') {
        ventesAPerte.push({
          nom: p.nomProduit,
          prix: prixUnitaire,
          cmup: this.toNumber(p.cmupActuel),
        });
      }

      const sousTotal = prixUnitaire * l.quantite;
      montantTotal += sousTotal;
      return {
        produitId: p.id,
        nomProduit: p.nomProduit,
        quantite: l.quantite,
        prixUnitaire,
        sousTotal,
        prixReference: audit.prixReference,
        bandePrix: audit.bandePrix,
        motifRemise: audit.motifRemise,
      };
    });

    const expiresAt = new Date(Date.now() + TICKET_VALIDITY_MS);

    const ticket = await this.db.$transaction(async (tx) => {
      const numeroTicket = await this.generateNumeroTicket(tx);
      return tx.ticketVente.create({
        data: {
          numeroTicket,
          idempotencyKey: dto.idempotencyKey,
          vendeurId: actor.id,
          clientId: dto.clientId ?? null,
          montantTotal,
          methodePaiement: dto.methodePaiement,
          noteCaissier: dto.noteCaissier?.trim() || null,
          expiresAt,
          lignes: { create: lignesData },
        },
        include: { lignes: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    this.events.emit(ticket);

    // Alerte super admin pour toute vente à perte (prix < CMUP)
    for (const v of ventesAPerte) {
      this.notifications
        .create(
          'VENTE_MAJ',
          `⚠️ Vente à perte : ${v.nom} vendu ${v.prix} FCFA (coût CMUP ${v.cmup} FCFA) — bon ${ticket.numeroTicket} par ${actor.nom}.`,
          actor,
        )
        .catch(() => {});
    }

    return ticket;
  }

  /** File d'attente caissier : tickets EN_ATTENTE non expirés */
  findPending() {
    return this.db.ticketVente.findMany({
      where: { statut: 'EN_ATTENTE', expiresAt: { gt: new Date() } },
      include: { lignes: true, client: { select: { id: true, nom: true, prenom: true, telephone: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
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
  async valider(ticketId: string, actor: NotificationActor, dto?: EncaisserTicketDto) {
    // Récupérer le ticket avant encaissement (pour les lignes et vendeurId)
    const ticket = await this.ticketService.findOne(ticketId);

    // Le caissier peut surcharger la méthode de paiement choisie par le vendeur
    const methodePaiement: MethodePaiement =
      (dto?.methodePaiement as MethodePaiement) ??
      (ticket.methodePaiement as MethodePaiement) ??
      'ESPECES';

    // Encaissement atomique via TicketVenteService (gère CaisseJour + crédit)
    const encaisse = await this.ticketService.encaisser(
      ticketId,
      actor.id,
      methodePaiement,
      {
        clientId: dto?.clientId,
        montantPaye: dto?.montantPaye,
        montantRecu: dto?.montantRecu,
        documentType: dto?.documentType,
        referencePaiement: dto?.referencePaiement ?? dto?.paymentReference,
        idempotencyKey: dto?.idempotencyKey,
        dateEcheance: dto?.dateEcheance ? new Date(dto.dateEcheance) : undefined,
      },
    );

    // Créer la Facture (hors transaction initiale — données d'audit)
    const totalTTC = this.toNumber(ticket.montantTotal);
    const facture = encaisse.facture;

    // Mettre à jour la prime du vendeur pour le mois en cours
    const periode = this.getPeriode(new Date());
    await this.db.primeVendeur.upsert({
      where: {
        vendeurId_periode: { vendeurId: ticket.vendeurId, periode },
      },
      create: {
        vendeurId: ticket.vendeurId,
        periode,
        nombreTickets: 1,
        montantTotal: totalTTC,
      },
      update: {
        nombreTickets: { increment: 1 },
        montantTotal: { increment: totalTTC },
      },
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

  generateNumeroTicket(tx: any): Promise<string> {
    return this.documentNumbers.nextDaily('TICKET_QUEUE', 'T-', tx);
  }

  private getPeriode(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
