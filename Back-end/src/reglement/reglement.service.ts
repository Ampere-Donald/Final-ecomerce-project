import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MethodePaiement, StatutPaiement } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import {
  NotificationService,
  NotificationActor,
} from 'src/notification/notification.service';
import { CaisseJourService } from 'src/caisse-jour/caisse-jour.service';
import { ActivityLogService } from 'src/admin-auth/activity-log.service';
import { CreateReglementDto } from './dto/create-reglement.dto';
import { AnnulerReglementDto } from './dto/annuler-reglement.dto';

@Injectable()
export class ReglementService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly caisseJour: CaisseJourService,
    private readonly activityLog: ActivityLogService,
  ) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Recalcule montantPaye + statutPaiement d'une vente à partir de ses règlements actifs. */
  private async recalcVente(tx: any, venteId: string) {
    const vente = await tx.vente.findUnique({ where: { id: venteId } });
    if (!vente) return;
    const reglements = await tx.reglement.findMany({
      where: { venteId, annulee: false },
      select: { montant: true },
    });
    const montantPaye = reglements.reduce(
      (acc: number, r: any) => acc + this.toNumber(r.montant),
      0,
    );
    const total = this.toNumber(vente.montantTotal);
    let statutPaiement: StatutPaiement;
    if (montantPaye >= total) statutPaiement = 'PAYE';
    else if (montantPaye > 0) statutPaiement = 'PARTIEL';
    else statutPaiement = 'NON_PAYE';

    await tx.vente.update({
      where: { id: venteId },
      data: {
        montantPaye,
        statutPaiement,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Enregistre un règlement (encaissement partiel ou solde) sur une vente à crédit.
   * Trace l'argent reçu dans la caisse du jour active (refusé si fermée).
   */
  async create(dto: CreateReglementDto, actor: NotificationActor) {
    if (dto.methodePaiement === 'CREDIT') {
      throw new BadRequestException(
        'Un règlement ne peut pas avoir la méthode CRÉDIT.',
      );
    }

    const vente = await this.db.vente.findUnique({
      where: { id: dto.venteId },
      include: { reglements: { where: { annulee: false }, select: { montant: true } } },
    });
    if (!vente) {
      throw new NotFoundException(`Vente ${dto.venteId} introuvable.`);
    }

    const total = this.toNumber(vente.montantTotal);
    const dejaPaye = vente.reglements.reduce(
      (acc, r) => acc + this.toNumber(r.montant),
      0,
    );
    const reste = total - dejaPaye;
    if (reste <= 0) {
      throw new BadRequestException('Cette vente est déjà soldée.');
    }
    if (dto.montant > reste + 0.001) {
      throw new BadRequestException(
        `Montant trop élevé. Reste à payer : ${reste.toFixed(2)} FCFA.`,
      );
    }

    // Caisse du jour active (créée au besoin), refus si fermée
    const cj = await this.caisseJour.getOrCreateToday(actor.id);
    if (cj.statut === 'FERMEE') {
      throw new BadRequestException(
        'La caisse du jour est fermée. Réouvrez une session pour enregistrer un règlement.',
      );
    }

    const result = await this.db.$transaction(async (tx: any) => {
      const reglement = await tx.reglement.create({
        data: {
          venteId: dto.venteId,
          montant: dto.montant,
          methodePaiement: dto.methodePaiement,
          caissierId: actor.id,
          caisseJourId: cj.id,
          note: dto.note?.trim() || null,
        },
      });

      await tx.caisse.create({
        data: {
          typeOperation: 'ENTREE',
          montant: dto.montant,
          motif: `Règlement crédit vente #${dto.venteId}`,
          venteId: dto.venteId,
          reglementId: reglement.id,
          caisseJourId: cj.id,
          effectueePar: actor.id,
        },
      });

      await this.recalcVente(tx, dto.venteId);

      return tx.reglement.findUnique({ where: { id: reglement.id } });
    });

    this.notifications
      .create(
        'CAISSE_CREEE',
        `Règlement crédit : +${dto.montant} FCFA (${dto.methodePaiement})`,
        actor,
      )
      .catch(() => {});

    return result;
  }

  /** Annule un règlement (faute de saisie) : restaure le solde et neutralise l'opération de caisse. */
  async annuler(id: string, dto: AnnulerReglementDto, actor: NotificationActor) {
    const reglement = await this.db.reglement.findUnique({ where: { id } });
    if (!reglement) {
      throw new NotFoundException(`Règlement ${id} introuvable.`);
    }
    if (reglement.annulee) {
      throw new BadRequestException('Ce règlement est déjà annulé.');
    }

    const result = await this.db.$transaction(async (tx: any) => {
      const updated = await tx.reglement.update({
        where: { id },
        data: {
          annulee: true,
          motifAnnulation: dto.motif.trim(),
          annuleeById: actor.id,
          annuleeAt: new Date(),
        },
      });

      // Neutraliser l'opération de caisse liée (exclue du solde via annulee=true)
      await tx.caisse.updateMany({
        where: { reglementId: id, annulee: false },
        data: {
          annulee: true,
          motifAnnulation: `Annulation règlement — ${dto.motif.trim()}`,
          annuleeById: actor.id,
          annuleeAt: new Date(),
        },
      });

      await this.recalcVente(tx, reglement.venteId);

      return updated;
    });

    this.activityLog
      .log(actor.id, 'REGLEMENT_ANNULE', {
        reglementId: id,
        venteId: reglement.venteId,
        montant: this.toNumber(reglement.montant),
        motif: dto.motif.trim(),
      })
      .catch(() => {});

    this.notifications
      .create(
        'CAISSE_MAJ',
        `Règlement annulé : -${this.toNumber(reglement.montant)} FCFA — ${dto.motif.trim()}`,
        actor,
      )
      .catch(() => {});

    return result;
  }

  /** Historique des règlements d'une vente (récents d'abord). */
  async findByVente(venteId: string) {
    return this.db.reglement.findMany({
      where: { venteId },
      orderBy: { dateReglement: 'desc' },
    });
  }
}
