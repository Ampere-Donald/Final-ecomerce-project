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
import { validerLignePrix } from 'src/pricing/pricing.util';
import { DocumentNumberService } from 'src/database/document-number.service';

const TICKET_VALIDITY_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class TicketVenteService {
  private readonly logger = new Logger(TicketVenteService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly caisseJour: CaisseJourService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Génère un numéro lisible : T-YYYYMMDD-NNNN où NNNN est l'ordre du jour. */
  private async generateNumeroTicket(): Promise<string> {
    return this.documentNumbers.nextDaily('TICKET_QUEUE', 'T-');
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

    // Rôle + autorisation de l'acteur (la base fait foi pour les bornes de prix)
    const acteur = await this.db.adminUser.findUnique({
      where: { id: vendeurId },
      select: { nom: true, role: true, peutVendreSousDemiGros: true },
    });
    const role = acteur?.role;
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
      // Prix saisi (POS), sinon prix promo/référence du produit
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

    // Alerte super admin pour toute vente à perte (prix < CMUP)
    for (const v of ventesAPerte) {
      this.notifications
        .create(
          'VENTE_MAJ',
          `⚠️ Vente à perte : ${v.nom} vendu ${v.prix} FCFA (coût CMUP ${v.cmup} FCFA) — ticket ${numeroTicket} par ${acteur?.nom ?? 'inconnu'}.`,
        )
        .catch(() => {});
    }

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

  /** Tickets d'un vendeur ou de tous les vendeurs (admin). */
  async listMine(vendeurId?: string) {
    return this.db.ticketVente.findMany({
      where: vendeurId ? { vendeurId } : undefined,
      include: {
        lignes: true,
        vendeur: { select: { id: true, nom: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
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
   *
   * Pour un encaissement à CRÉDIT : un client enregistré est obligatoire ; un
   * acompte facultatif est tracé comme premier règlement (cohérent avec le
   * recalcul de montantPaye côté ReglementService). Seul l'acompte entre en
   * caisse (rien si l'acompte est nul).
   */
  async encaisser(
    ticketId: string,
    caissierId: string,
    methodePaiement: MethodePaiement,
    options: { clientId?: string; montantPaye?: number } = {},
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

    const isCredit = methodePaiement === 'CREDIT';
    const clientId = options.clientId ?? ticket.clientId ?? null;
    const montantTotal = this.toNumber(ticket.montantTotal);

    if (isCredit && !clientId) {
      throw new BadRequestException(
        'Une vente à crédit exige un client enregistré.',
      );
    }

    // Montant effectivement encaissé (acompte pour le crédit, total sinon)
    let montantPaye = montantTotal;
    if (isCredit) {
      const acompte = this.toNumber(options.montantPaye ?? 0);
      if (acompte < 0 || acompte > montantTotal) {
        throw new BadRequestException(
          `Acompte invalide (entre 0 et ${montantTotal} FCFA).`,
        );
      }
      montantPaye = acompte;
    }
    const statutPaiement =
      montantPaye >= montantTotal
        ? 'PAYE'
        : montantPaye > 0
          ? 'PARTIEL'
          : 'NON_PAYE';

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
          clientId,
          montantTotal: ticket.montantTotal,
          montantPaye,
          methodePaiement,
          statutPaiement,
          lignesVente: {
            create: ticket.lignes.map((l) => ({
              produitId: l.produitId,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              sousTotal: l.sousTotal,
              prixReference: l.prixReference,
              bandePrix: l.bandePrix,
              motifRemise: l.motifRemise,
            })),
          },
        },
      });

      // 2. Décrémenter stock en parallèle (re-vérification atomique — audit P2)
      const stockResults = await Promise.all(
        ticket.lignes.map((l) =>
          tx.produit.updateMany({
            where: { id: l.produitId, quantiteStock: { gte: l.quantite } },
            data: { quantiteStock: { decrement: l.quantite } },
          }),
        ),
      );
      const insuffisant = stockResults
        .map((r, i) => (r.count === 0 ? ticket.lignes[i] : null))
        .filter(Boolean);
      if (insuffisant.length > 0) {
        // Récupérer les données réelles (en parallèle) pour le message d'erreur
        const details = await Promise.all(
          insuffisant.map((l) =>
            tx.produit.findUnique({
              where: { id: l!.produitId },
              select: { nomProduit: true, quantiteStock: true },
            }),
          ),
        );
        throw new BadRequestException(
          details
            .map((p, i) => `Stock insuffisant pour ${p?.nomProduit ?? insuffisant[i]!.nomProduit} (dispo: ${p?.quantiteStock ?? 0}, demandé: ${insuffisant[i]!.quantite})`)
            .join(' | '),
        );
      }
      // Créer les mouvements de stock en parallèle
      await Promise.all(
        ticket.lignes.map((l) =>
          tx.mouvementStock.create({
            data: {
              produitId: l.produitId,
              typeMouvement: 'SORTIE',
              quantite: l.quantite,
              motif: `Vente ticket ${ticket.numeroTicket}`,
            },
          }),
        ),
      );

      // 3. Pour le crédit : tracer l'acompte comme premier règlement
      let reglementId: string | null = null;
      if (isCredit && montantPaye > 0) {
        const reglement = await tx.reglement.create({
          data: {
            venteId: vente.id,
            montant: montantPaye,
            methodePaiement: 'ESPECES', // acompte versé au comptoir
            caissierId,
            caisseJourId: cj.id,
            note: `Acompte à la vente — ticket ${ticket.numeroTicket}`,
          },
        });
        reglementId = reglement.id;
      }

      // 4. Opération caisse du jour (uniquement l'argent réellement reçu)
      if (montantPaye > 0) {
        await tx.caisse.create({
          data: {
            typeOperation: 'ENTREE',
            montant: montantPaye,
            motif: isCredit
              ? `Acompte ticket ${ticket.numeroTicket}`
              : `Encaissement ticket ${ticket.numeroTicket}`,
            venteId: vente.id,
            reglementId,
            caisseJourId: cj.id,
            effectueePar: caissierId,
          },
        });
      }

      // 5. Mettre à jour le ticket
      const updated = await tx.ticketVente.update({
        where: { id: ticketId },
        data: {
          statut: 'ENCAISSE',
          caissierId,
          clientId,
          methodePaiement,
          venteId: vente.id,
          encaisseAt: new Date(),
        },
        include: { lignes: true, vente: true },
      });

      const totalHT = montantTotal / 1.1925;
      const facture = await tx.facture.create({
        data: {
          numero: await this.documentNumbers.nextAnnual('TICKET_CAISSE', 'TIC-', tx),
          type: 'TICKET_CAISSE',
          ticketId,
          venteId: vente.id,
          clientId: clientId ?? undefined,
          vendeurId: ticket.vendeurId,
          caissierId,
          totalHT,
          tva: montantTotal - totalHT,
          totalTTC: montantTotal,
          methodePaiement,
          lignes: {
            create: ticket.lignes.map((ligne) => {
              const prixTTC = this.toNumber(ligne.prixUnitaire);
              const sousTotalTTC = this.toNumber(ligne.sousTotal);
              return {
                nomProduit: ligne.nomProduit,
                quantite: ligne.quantite,
                prixUnitaireHT: prixTTC / 1.1925,
                prixUnitaireTTC: prixTTC,
                sousTotalHT: sousTotalTTC / 1.1925,
                sousTotalTTC,
              };
            }),
          },
        },
        include: { lignes: true, client: true },
      });

      return { ...updated, facture };
    });

    this.notifications
      .create(
        'VENTE_CREEE',
        isCredit
          ? `Ticket ${ticket.numeroTicket} à crédit — ${montantTotal} FCFA (acompte ${montantPaye})`
          : `Ticket ${ticket.numeroTicket} encaissé — ${montantTotal} FCFA (${methodePaiement})`,
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
