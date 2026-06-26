import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Devise } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationActor } from 'src/notification/notification.service';
import { TauxChangeService } from 'src/taux-change/taux-change.service';
import { AchatService } from 'src/achat/achat.service';
import { CreateCommandeDto, LigneCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';

const FENETRE_VENTES_JOURS = 60;
const COUVERTURE_CIBLE_JOURS = 30;
const SEUIL_JOURS_RESTANTS = 21;

@Injectable()
export class CommandeFournisseurService {
  constructor(
    private readonly db: DatabaseService,
    private readonly taux: TauxChangeService,
    private readonly achatService: AchatService,
  ) {}

  private toNum(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  async create(dto: CreateCommandeDto, actor: NotificationActor) {
    const fournisseur = await this.db.fournisseur.findUnique({
      where: { id: dto.fournisseurId },
    });
    if (!fournisseur) throw new NotFoundException('Fournisseur introuvable.');

    const devise = dto.devise ?? fournisseur.deviseDefaut ?? Devise.FCFA;
    const tauxVersFcfa =
      dto.tauxVersFcfa ?? this.toNum((await this.taux.getLatest(devise)).tauxVersFcfa);

    const lignesData = await this.construireLignes(dto.lignes);
    const totalDevise = lignesData.reduce((s, l) => s + l.sousTotal, 0);

    const reference = await this.genererReference();

    return this.db.commandeFournisseur.create({
      data: {
        reference,
        fournisseurId: dto.fournisseurId,
        devise,
        tauxVersFcfa,
        notes: dto.notes ?? null,
        totalDevise,
        totalFcfa: totalDevise * tauxVersFcfa,
        createdById: actor.id,
        lignes: { create: lignesData },
      },
      include: { lignes: true },
    });
  }

  findAll() {
    return this.db.commandeFournisseur.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: { select: { lignes: true } },
      },
    });
  }

  async findOne(id: string) {
    const cmd = await this.db.commandeFournisseur.findUnique({
      where: { id },
      include: { lignes: { orderBy: { nomProduit: 'asc' } } },
    });
    if (!cmd) throw new NotFoundException('Bon de commande introuvable.');
    return cmd;
  }

  async update(id: string, dto: UpdateCommandeDto) {
    const cmd = await this.findOne(id);
    if (cmd.statut !== 'BROUILLON') {
      throw new BadRequestException('Seul un bon en brouillon peut être modifié.');
    }

    const data: any = {};
    if (dto.notes !== undefined) data.notes = dto.notes;
    const tauxVersFcfa =
      dto.tauxVersFcfa != null ? dto.tauxVersFcfa : this.toNum(cmd.tauxVersFcfa);
    if (dto.tauxVersFcfa != null) data.tauxVersFcfa = dto.tauxVersFcfa;

    if (dto.lignes) {
      const lignesData = await this.construireLignes(dto.lignes);
      const totalDevise = lignesData.reduce((s, l) => s + l.sousTotal, 0);
      data.totalDevise = totalDevise;
      data.totalFcfa = totalDevise * tauxVersFcfa;
      await this.db.$transaction([
        this.db.ligneCommandeFournisseur.deleteMany({ where: { commandeId: id } }),
        this.db.commandeFournisseur.update({
          where: { id },
          data: { ...data, lignes: { create: lignesData } },
        }),
      ]);
    } else if (dto.tauxVersFcfa != null) {
      data.totalFcfa = this.toNum(cmd.totalDevise) * tauxVersFcfa;
      await this.db.commandeFournisseur.update({ where: { id }, data });
    } else if (Object.keys(data).length) {
      await this.db.commandeFournisseur.update({ where: { id }, data });
    }

    return this.findOne(id);
  }

  async envoyer(id: string) {
    const cmd = await this.findOne(id);
    if (cmd.statut !== 'BROUILLON') {
      throw new BadRequestException('Ce bon a déjà été envoyé ou clôturé.');
    }
    return this.db.commandeFournisseur.update({
      where: { id },
      data: { statut: 'ENVOYEE', envoyeeAt: new Date() },
    });
  }

  async annuler(id: string) {
    const cmd = await this.findOne(id);
    if (cmd.statut === 'RECUE') {
      throw new BadRequestException('Un bon déjà reçu ne peut être annulé.');
    }
    return this.db.commandeFournisseur.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }

  /** Convertit le bon en Achat BROUILLON (réutilise AchatService). */
  async convertirAchat(id: string, actor: NotificationActor) {
    const cmd = await this.findOne(id);
    if (cmd.achatId) {
      throw new BadRequestException('Ce bon a déjà été converti en achat.');
    }
    if (cmd.statut === 'ANNULEE') {
      throw new BadRequestException('Un bon annulé ne peut être converti.');
    }
    if (!cmd.lignes.length) {
      throw new BadRequestException('Bon de commande vide.');
    }

    const achat = await this.achatService.create(
      {
        fournisseurId: cmd.fournisseurId,
        devise: cmd.devise,
        tauxVersFcfa: this.toNum(cmd.tauxVersFcfa),
        lignesAchat: cmd.lignes.map((l) => ({
          produitId: l.produitId,
          quantite: l.quantite,
          prixUnitaireDevise: this.toNum(l.prixNegocie),
        })),
      },
      actor,
    );

    await this.db.commandeFournisseur.update({
      where: { id },
      data: { achatId: achat.id, statut: 'RECUE', recueAt: new Date() },
    });

    return { commande: await this.findOne(id), achat };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Construit les lignes avec snapshot du produit + sous-total = quantité × prix négocié. */
  private async construireLignes(lignes: LigneCommandeDto[]) {
    if (!lignes?.length) {
      throw new BadRequestException('Le bon doit contenir au moins une ligne.');
    }
    const ids = [...new Set(lignes.map((l) => l.produitId))];
    const produits = await this.db.produit.findMany({
      where: { id: { in: ids } },
      select: { id: true, nomProduit: true, designationEn: true },
    });
    const byId = new Map(produits.map((p) => [p.id, p]));

    return lignes.map((l) => {
      const p = byId.get(l.produitId);
      if (!p) throw new NotFoundException(`Produit ${l.produitId} introuvable.`);
      const rate = this.toNum(l.rate);
      const prixNegocie = l.prixNegocie != null ? this.toNum(l.prixNegocie) : rate;
      return {
        produitId: p.id,
        nomProduit: p.nomProduit,
        designationEn: p.designationEn,
        quantite: l.quantite,
        rate,
        prixNegocie,
        sousTotal: prixNegocie * l.quantite,
      };
    });
  }

  private async genererReference(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const count = await this.db.commandeFournisseur.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    return `BC-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  // ── Suggestion de réapprovisionnement ────────────────────────────────────

  async suggestions(params: { categorieId?: string; codeFamille?: string }) {
    const where: any = {};
    if (params.categorieId) where.categorieId = params.categorieId;
    else if (params.codeFamille) where.codeFamille = params.codeFamille;

    const produits = await this.db.produit.findMany({
      where,
      select: {
        id: true,
        nomProduit: true,
        designationEn: true,
        quantiteStock: true,
        seuilAlerte: true,
        quantiteGros: true,
        dernierCoutAchatFcfa: true,
      },
    });
    if (produits.length === 0) return [];

    const depuis = new Date(Date.now() - FENETRE_VENTES_JOURS * 24 * 3600 * 1000);
    const ids = produits.map((p) => p.id);

    // Ventes agrégées sur la fenêtre
    const ventes = await this.db.ligneVente.groupBy({
      by: ['produitId'],
      where: { produitId: { in: ids }, vente: { dateVente: { gte: depuis } } },
      _sum: { quantite: true },
    });
    const venduParId = new Map(ventes.map((v) => [v.produitId, v._sum.quantite ?? 0]));

    // Lot d'achat habituel = quantité la plus fréquente dans les achats passés
    const achats = await this.db.ligneAchat.groupBy({
      by: ['produitId', 'quantite'],
      where: { produitId: { in: ids } },
      _count: { _all: true },
    });
    const lotParId = new Map<string, number>();
    const meilleurCompte = new Map<string, number>();
    for (const a of achats) {
      const c = a._count._all;
      if (c > (meilleurCompte.get(a.produitId) ?? 0)) {
        meilleurCompte.set(a.produitId, c);
        lotParId.set(a.produitId, a.quantite);
      }
    }

    const suggestions = produits.map((p) => {
      const vendu = venduParId.get(p.id) ?? 0;
      const ventesParJour = vendu / FENETRE_VENTES_JOURS;
      const joursRestants =
        ventesParJour > 0 ? p.quantiteStock / ventesParJour : Infinity;
      const lotHabituel = lotParId.get(p.id) ?? p.quantiteGros ?? 0;
      const besoinCouverture = Math.max(
        0,
        Math.ceil(ventesParJour * COUVERTURE_CIBLE_JOURS) - p.quantiteStock,
      );
      const quantiteSuggeree = Math.max(lotHabituel, besoinCouverture);
      const aSuggerer =
        joursRestants < SEUIL_JOURS_RESTANTS || p.quantiteStock <= p.seuilAlerte;
      return {
        produitId: p.id,
        nomProduit: p.nomProduit,
        designationEn: p.designationEn,
        quantiteStock: p.quantiteStock,
        ventesParJour: Math.round(ventesParJour * 100) / 100,
        joursRestants: joursRestants === Infinity ? null : Math.round(joursRestants),
        quantiteSuggeree: aSuggerer ? Math.max(1, quantiteSuggeree) : 0,
        rate: this.toNum(p.dernierCoutAchatFcfa),
        aSuggerer,
      };
    });

    // Les plus urgents d'abord, puis le reste
    return suggestions.sort((a, b) => {
      if (a.aSuggerer !== b.aSuggerer) return a.aSuggerer ? -1 : 1;
      return (a.joursRestants ?? 9999) - (b.joursRestants ?? 9999);
    });
  }
}
