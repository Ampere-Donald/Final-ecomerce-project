import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  NotificationActor,
  NotificationService,
} from 'src/notification/notification.service';
import { CreateInventaireDto } from './dto/create-inventaire.dto';
import { ComptageDto } from './dto/comptage.dto';
import { CreateDelegationDto } from './dto/delegation.dto';

@Injectable()
export class InventaireService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Inventaire ──────────────────────────────────────────────────────────

  /** Crée une session d'inventaire : snapshot du stock système du périmètre. */
  async create(dto: CreateInventaireDto, actor: NotificationActor) {
    const where: any = {};
    let perimetre = 'Complet';

    if (dto.categorieId) {
      const cat = await this.db.categorie.findUnique({
        where: { id: dto.categorieId },
        select: { nom: true },
      });
      if (!cat) throw new NotFoundException('Catégorie introuvable.');
      where.categorieId = dto.categorieId;
      perimetre = `Catégorie : ${cat.nom}`;
    } else if (dto.codeFamille) {
      where.codeFamille = dto.codeFamille;
      perimetre = `Famille : ${dto.codeFamille}`;
    }

    const produits = await this.db.produit.findMany({
      where,
      select: { id: true, nomProduit: true, codeFamille: true, quantiteStock: true },
      orderBy: { nomProduit: 'asc' },
    });
    if (produits.length === 0) {
      throw new BadRequestException('Aucun produit dans ce périmètre.');
    }

    const reference = await this.genererReference();

    return this.db.inventaire.create({
      data: {
        reference,
        perimetre,
        categorieId: dto.categorieId ?? null,
        codeFamille: dto.codeFamille ?? null,
        createdById: actor.id,
        lignes: {
          create: produits.map((p) => ({
            produitId: p.id,
            nomProduit: p.nomProduit,
            codeFamille: p.codeFamille,
            stockSysteme: p.quantiteStock,
          })),
        },
      },
      include: { lignes: { orderBy: { nomProduit: 'asc' } } },
    });
  }

  findAll() {
    return this.db.inventaire.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { lignes: true } } },
    });
  }

  async findOne(id: string) {
    const inv = await this.db.inventaire.findUnique({
      where: { id },
      include: { lignes: { orderBy: { nomProduit: 'asc' } } },
    });
    if (!inv) throw new NotFoundException('Inventaire introuvable.');
    return inv;
  }

  /** Enregistre les quantités comptées (tant que l'inventaire est EN_COURS). */
  async comptage(id: string, dto: ComptageDto, _actor: NotificationActor) {
    const inv = await this.findOne(id);
    if (inv.statut !== 'EN_COURS') {
      throw new BadRequestException(
        'Seul un inventaire en cours peut être compté.',
      );
    }
    const lignesValides = new Set(inv.lignes.map((l) => l.id));
    await this.db.$transaction(
      dto.lignes
        .filter((l) => lignesValides.has(l.id))
        .map((l) =>
          this.db.ligneInventaire.update({
            where: { id: l.id },
            data: { stockCompte: l.stockCompte },
          }),
        ),
    );
    return this.findOne(id);
  }

  /**
   * Valide l'inventaire : calcule les écarts et génère un mouvement AJUSTEMENT
   * tracé par écart non nul. Atomique.
   * Autorisé au SUPER_ADMIN, ou à un ADMIN disposant d'une délégation active.
   */
  async valider(id: string, actor: NotificationActor) {
    const inv = await this.findOne(id);
    if (inv.statut !== 'EN_COURS') {
      throw new BadRequestException('Cet inventaire est déjà clôturé.');
    }

    const estSuper = actor.role === 'SUPER_ADMIN';
    const viaDelegation = !estSuper && (await this.aDelegationActive(actor.id));
    if (!estSuper && !viaDelegation) {
      throw new ForbiddenException(
        "Validation réservée au super admin (ou à un admin disposant d'une délégation active).",
      );
    }

    const aCompter = inv.lignes.filter((l) => l.stockCompte != null);
    if (aCompter.length === 0) {
      throw new BadRequestException(
        'Aucune quantité comptée : renseignez le comptage avant de valider.',
      );
    }

    const ecarts = aCompter
      .map((l) => ({ ligne: l, ecart: (l.stockCompte as number) - l.stockSysteme }))
      .filter((e) => e.ecart !== 0);

    await this.db.$transaction(async (tx: any) => {
      for (const { ligne, ecart } of ecarts) {
        await tx.mouvementStock.create({
          data: {
            produitId: ligne.produitId,
            typeMouvement: 'AJUSTEMENT',
            quantite: ecart,
            motif: `Inventaire ${inv.reference}`,
          },
        });
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: {
            quantiteStock: { increment: ecart },
            version: { increment: 1 },
          },
        });
        await tx.ligneInventaire.update({
          where: { id: ligne.id },
          data: { ecart },
        });
      }
      // Écart nul : on fige tout de même l'écart à 0 pour l'historique.
      await tx.ligneInventaire.updateMany({
        where: { inventaireId: inv.id, stockCompte: { not: null }, ecart: null },
        data: { ecart: 0 },
      });
      await tx.inventaire.update({
        where: { id: inv.id },
        data: {
          statut: 'VALIDE',
          valideById: actor.id,
          valideAt: new Date(),
          viaDelegation,
        },
      });
    });

    await this.journaliser(actor.id, 'INVENTAIRE_VALIDE', {
      inventaireId: inv.id,
      reference: inv.reference,
      nbEcarts: ecarts.length,
      viaDelegation,
    });
    this.notifications
      .create(
        'MOUVEMENT_STOCK_CREE',
        `Inventaire ${inv.reference} validé par ${actor.nom} — ${ecarts.length} écart(s) ajusté(s)${viaDelegation ? ' (via délégation)' : ''}.`,
        actor,
      )
      .catch(() => {});

    return this.findOne(id);
  }

  async annuler(id: string, actor: NotificationActor) {
    const inv = await this.findOne(id);
    if (inv.statut !== 'EN_COURS') {
      throw new BadRequestException('Seul un inventaire en cours peut être annulé.');
    }
    return this.db.inventaire.update({
      where: { id },
      data: { statut: 'ANNULE', valideById: actor.id, valideAt: new Date() },
    });
  }

  // ── Délégations (super admin) ───────────────────────────────────────────

  accorderDelegation(dto: CreateDelegationDto, actor: NotificationActor) {
    return this.db.delegationInventaire.create({
      data: {
        adminUserId: dto.adminUserId,
        accordeById: actor.id,
        finAt: new Date(dto.finAt),
        motif: dto.motif ?? null,
      },
    });
  }

  listDelegations() {
    return this.db.delegationInventaire.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async revoquerDelegation(id: string) {
    const d = await this.db.delegationInventaire.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Délégation introuvable.');
    return this.db.delegationInventaire.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Vrai si l'admin a une délégation active couvrant l'instant présent. */
  async aDelegationActive(adminUserId: string): Promise<boolean> {
    const now = new Date();
    const d = await this.db.delegationInventaire.findFirst({
      where: {
        adminUserId,
        active: true,
        debutAt: { lte: now },
        finAt: { gte: now },
      },
      select: { id: true },
    });
    return !!d;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async genererReference(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const count = await this.db.inventaire.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    return `INV-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  private async journaliser(adminUserId: string, action: string, details: any) {
    try {
      await this.db.activityLog.create({
        data: { adminUserId, action, details },
      });
    } catch {
      /* journalisation best-effort */
    }
  }
}
