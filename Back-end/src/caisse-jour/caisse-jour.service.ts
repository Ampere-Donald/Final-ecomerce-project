import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TypeOperation } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class CaisseJourService {
  private readonly logger = new Logger(CaisseJourService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Date du jour en Africa/Douala (UTC+1), normalisée à minuit UTC pour le type DATE. */
  private getDateDouala(): Date {
    const now = new Date();
    const douala = new Date(
      now.toLocaleString('en-US', { timeZone: 'Africa/Douala' }),
    );
    return new Date(
      Date.UTC(douala.getFullYear(), douala.getMonth(), douala.getDate()),
    );
  }

  /**
   * Récupère la caisse du jour active pour aujourd'hui (Douala), ou la crée
   * automatiquement avec un solde initial de 0.
   *
   * Si la caisse du jour existant est déjà FERMEE, n'en crée pas de nouvelle
   * (un jour = une seule caisse, identifiée par sa date).
   */
  async getOrCreateToday(caissierId?: string | null) {
    const today = this.getDateDouala();
    let cj = await this.db.caisseJour.findUnique({ where: { date: today } });
    if (!cj) {
      cj = await this.db.caisseJour.create({
        data: {
          date: today,
          ouvertureAt: new Date(),
          caissierId: caissierId ?? null,
        },
      });
      this.logger.log(
        `Nouvelle caisse du jour créée : ${today.toISOString().slice(0, 10)}`,
      );
    } else if (!cj.caissierId && caissierId) {
      // Premier caissier qui ouvre la session du jour
      cj = await this.db.caisseJour.update({
        where: { id: cj.id },
        data: { caissierId },
      });
    }
    return cj;
  }

  /** Calcule le solde courant d'une caisse du jour (somme entrées - sorties, hors annulées). */
  async getSoldeJour(caisseJourId: string, client: any = this.db): Promise<number> {
    const ops = await client.caisse.findMany({
      where: { caisseJourId, annulee: false },
      select: { typeOperation: true, montant: true },
    });
    return ops.reduce((acc: number, op: any) => {
      const montant = this.toNumber(op.montant);
      return op.typeOperation === 'ENTREE' ? acc + montant : acc - montant;
    }, 0);
  }

  /** État synthétique de la caisse du jour active (avec solde temps réel + opérations). */
  async aujourdhui(caissierId?: string | null) {
    const cj = await this.getOrCreateToday(caissierId);
    const solde = await this.getSoldeJour(cj.id);
    const destination = cj.statut === 'FERMEE'
      ? await this.getClosureDestination(cj.id)
      : null;
    return { ...cj, solde, destination };
  }

  private async getClosureDestination(caisseJourId: string, client: any = this.db) {
    const operation = await client.caisse.findFirst({
      where: {
        transfertGroupId: caisseJourId,
        annulee: false,
      },
      include: {
        coffre: { select: { id: true, nom: true } },
      },
      orderBy: { dateOperation: 'desc' },
    });

    if (!operation) return null;
    return operation.coffre
      ? { type: 'COFFRE', coffre: operation.coffre }
      : { type: 'CAISSE_GLOBALE', coffre: null };
  }

  /** Opérations détaillées d'une caisse du jour (ordre antéchronologique). */
  async getOperations(caisseJourId: string) {
    const cj = await this.db.caisseJour.findUnique({
      where: { id: caisseJourId },
    });
    if (!cj) {
      throw new NotFoundException(`Caisse du jour ${caisseJourId} introuvable.`);
    }
    const operations = await this.db.caisse.findMany({
      where: { caisseJourId },
      orderBy: { dateOperation: 'desc' },
    });
    const solde = await this.getSoldeJour(caisseJourId);
    return { caisseJour: cj, operations, solde };
  }

  /**
   * Enregistre une opération (ENTREE / SORTIE) sur la caisse du jour.
   * Utilisé par le caissier pour les ventes comptant et les sorties tracées.
   *
   * Refuse si la caisse du jour est fermée.
   */
  async addOperation(
    caisseJourId: string,
    typeOperation: TypeOperation,
    montant: number,
    motif: string,
    actorId: string,
  ) {
    const cj = await this.db.caisseJour.findUnique({
      where: { id: caisseJourId },
    });
    if (!cj) {
      throw new NotFoundException(`Caisse du jour ${caisseJourId} introuvable.`);
    }
    if (cj.statut === 'FERMEE') {
      throw new BadRequestException(
        'La caisse du jour est fermée. Réouvrez une nouvelle session demain matin.',
      );
    }
    if (montant <= 0) {
      throw new BadRequestException('Le montant doit être strictement positif.');
    }
    if (!motif?.trim()) {
      throw new BadRequestException('Le motif est obligatoire pour la traçabilité.');
    }

    const op = await this.db.caisse.create({
      data: {
        typeOperation,
        montant,
        motif: motif.trim(),
        caisseJourId,
        effectueePar: actorId,
      },
    });

    this.notifications
      .create(
        'CAISSE_CREEE',
        `Caisse du jour : ${typeOperation === 'ENTREE' ? '+' : '-'}${montant} FCFA — ${motif.trim()}`,
      )
      .catch(() => {});

    return op;
  }

  /** Liste historique des caisses du jour (paginable par dates). */
  async historique(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const list = await this.db.caisseJour.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 90,
    });
    const enriched = await Promise.all(
      list.map(async (cj) => ({
        ...cj,
        solde: cj.soldeCloture
          ? this.toNumber(cj.soldeCloture)
          : await this.getSoldeJour(cj.id),
      })),
    );
    return enriched;
  }

  async statsCaissier(caissierId: string, periode: string) {
    const [year, month] = (periode || '').split('-').map(Number);
    if (!year || !month) {
      throw new BadRequestException('La periode doit etre au format YYYY-MM.');
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [factures, caissesJour] = await Promise.all([
      this.db.facture.findMany({
        where: {
          caissierId,
          dateEmission: { gte: start, lt: end },
        },
        include: {
          lignes: true,
          vendeur: { select: { id: true, nom: true } },
          client: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: { dateEmission: 'desc' },
      }),
      this.db.caisseJour.findMany({
        where: {
          caissierId,
          date: { gte: start, lt: end },
        },
        include: {
          operations: {
            where: { annulee: false },
            orderBy: { dateOperation: 'asc' },
          },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const parMode: Record<string, number> = {};
    const parJourMap = new Map<string, { date: string; nb: number; montant: number }>();
    let montantTotal = 0;
    let creditsAccordes = 0;

    for (const f of factures) {
      const montant = this.toNumber(f.totalTTC);
      montantTotal += montant;
      parMode[f.methodePaiement] = (parMode[f.methodePaiement] || 0) + montant;
      if (f.methodePaiement === 'CREDIT') creditsAccordes += montant;

      const date = f.dateEmission.toISOString().slice(0, 10);
      const row = parJourMap.get(date) || { date, nb: 0, montant: 0 };
      row.nb += 1;
      row.montant += montant;
      parJourMap.set(date, row);
    }

    const ecarts = caissesJour.map((cj) => {
      const theorique = cj.operations.reduce((acc, op) => {
        const montant = this.toNumber(op.montant);
        return op.typeOperation === 'ENTREE' ? acc + montant : acc - montant;
      }, 0);
      const reel = cj.soldeCloture == null ? null : this.toNumber(cj.soldeCloture);
      return {
        date: cj.date.toISOString().slice(0, 10),
        theorique,
        reel,
        ecart: reel == null ? null : reel - theorique,
        statut: cj.statut,
      };
    });

    return {
      caissierId,
      periode,
      nbEncaissements: factures.length,
      montantTotal,
      parMode,
      creditsAccordes,
      ecarts,
      parJour: Array.from(parJourMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      transactions: factures,
    };
  }

  /**
   * Ferme la caisse du jour et transfère son solde vers la caisse globale
   * ou vers un coffre actif choisi par le caissier.
   *
   * Atomique : tout est annulé en cas d'échec.
   */
  async fermer(
    caisseJourId: string,
    ferméParId: string,
    note?: string,
    coffreId?: string,
  ) {
    const cj = await this.db.caisseJour.findUnique({
      where: { id: caisseJourId },
    });
    if (!cj) {
      throw new NotFoundException(`Caisse du jour ${caisseJourId} introuvable.`);
    }
    if (cj.statut === 'FERMEE') {
      throw new BadRequestException('Cette caisse du jour est déjà fermée.');
    }

    const result = await this.db.$transaction(async (tx: any) => {
      const solde = await this.getSoldeJour(caisseJourId, tx);
      const coffre = coffreId
        ? await tx.coffre.findUnique({ where: { id: coffreId } })
        : null;

      if (coffreId && !coffre) {
        throw new NotFoundException('Le coffre de destination est introuvable.');
      }
      if (coffre && coffre.statut !== 'ACTIF') {
        throw new BadRequestException(
          'Ce coffre ne peut plus recevoir de transfert.',
        );
      }
      if (coffre && solde <= 0) {
        throw new BadRequestException(
          'Aucun solde positif ne peut être transféré vers ce coffre.',
        );
      }

      const updated = await tx.caisseJour.update({
        where: { id: caisseJourId },
        data: {
          statut: 'FERMEE',
          fermetureAt: new Date(),
          soldeCloture: solde,
        },
      });

      // Écriture récapitulative dans la destination (hors caisseJourId).
      if (solde !== 0) {
        const dateLabel = cj.date.toISOString().slice(0, 10);
        await tx.caisse.create({
          data: {
            coffreId: coffre?.id ?? null,
            typeOperation: solde > 0 ? 'ENTREE' : 'SORTIE',
            montant: Math.abs(solde),
            motif: [
              `Clôture caisse du jour ${dateLabel}`,
              coffre ? `vers coffre ${coffre.nom}` : 'vers caisse globale',
              note?.trim(),
            ].filter(Boolean).join(' — '),
            transfertGroupId: caisseJourId,
            effectueePar: ferméParId,
            // caisseJourId volontairement omis : cette écriture appartient
            // à la destination et ne doit pas être recomptée dans la journée.
          },
        });

        if (coffre?.objectifMontant) {
          const operations = await tx.caisse.findMany({
            where: { coffreId: coffre.id, annulee: false },
            select: { typeOperation: true, montant: true },
          });
          const soldeCoffre = operations.reduce(
            (total: number, operation: any) => {
              const montant = this.toNumber(operation.montant);
              return operation.typeOperation === 'ENTREE'
                ? total + montant
                : total - montant;
            },
            0,
          );
          if (soldeCoffre >= this.toNumber(coffre.objectifMontant)) {
            await tx.coffre.update({
              where: { id: coffre.id },
              data: { statut: 'ATTEINT' },
            });
          }
        }
      }

      return {
        ...updated,
        solde,
        destination: coffre
          ? { type: 'COFFRE', coffre: { id: coffre.id, nom: coffre.nom } }
          : { type: 'CAISSE_GLOBALE', coffre: null },
      };
    });

    this.notifications
      .create(
        'CAISSE_MAJ',
        `Caisse du jour ${cj.date.toISOString().slice(0, 10)} fermée. Solde transféré : ${result.solde} FCFA vers ${result.destination.coffre?.nom ?? 'la caisse globale'}.`,
      )
      .catch(() => {});

    return result;
  }

  /**
   * Rouvre une caisse du jour fermée.
   * Réservé au SUPER_ADMIN uniquement.
   * L'action est tracée dans la caisse globale pour audit.
   */
  async rouvrir(caisseJourId: string, rouvertParId: string) {
    const cj = await this.db.caisseJour.findUnique({
      where: { id: caisseJourId },
    });
    if (!cj) {
      throw new NotFoundException(`Caisse du jour ${caisseJourId} introuvable.`);
    }
    if (cj.statut === 'OUVERTE') {
      throw new BadRequestException('Cette caisse du jour est déjà ouverte.');
    }

    const dateLabel = cj.date.toISOString().slice(0, 10);

    const updated = await this.db.$transaction(async (tx: any) => {
      const result = await tx.caisseJour.update({
        where: { id: caisseJourId },
        data: {
          statut: 'OUVERTE',
          fermetureAt: null,
          soldeCloture: null,
        },
      });

      // Annule l'écriture de transfert créée lors de la clôture pour éviter
      // un double comptage si la caisse est ensuite refermée.
      await tx.caisse.updateMany({
        where: {
          transfertGroupId: caisseJourId,
          annulee: false,
        },
        data: {
          annulee: true,
          motifAnnulation: `Réouverture caisse du jour ${dateLabel}`,
          annuleeById: rouvertParId,
          annuleeAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Trace d'audit obligatoire dans la caisse globale
      await tx.caisse.create({
        data: {
          typeOperation: 'ENTREE' as TypeOperation,
          montant: 0,
          motif: `[AUDIT] Réouverture caisse du jour ${dateLabel} par SUPER_ADMIN (id: ${rouvertParId})`,
          effectueePar: rouvertParId,
        },
      });

      return result;
    });

    this.logger.warn(
      `AUDIT — Caisse du jour ${dateLabel} (id: ${caisseJourId}) réouverte par SUPER_ADMIN (id: ${rouvertParId}) le ${new Date().toISOString()}`,
    );

    this.notifications
      .create(
        'CAISSE_MAJ',
        `Caisse du jour ${dateLabel} réouverte par un administrateur.`,
      )
      .catch(() => {});

    return updated;
  }
}
