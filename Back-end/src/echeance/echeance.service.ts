import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RecurrenceEcheance, TypeAlerte } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CaisseService } from 'src/caisse/caisse.service';
import {
  NotificationActor,
  NotificationService,
} from 'src/notification/notification.service';
import { MailService } from 'src/auth/mail.service';
import { CreateEcheanceDto } from './dto/create-echeance.dto';
import { UpdateEcheanceDto } from './dto/update-echeance.dto';

interface EmitOptions {
  joursRestants?: number;
  manuel?: boolean;
  actor?: NotificationActor;
}

@Injectable()
export class EcheanceService {
  private readonly logger = new Logger(EcheanceService.name);
  private readonly TZ = 'Africa/Douala';

  constructor(
    private readonly db: DatabaseService,
    private readonly caisseService: CaisseService,
    private readonly notifications: NotificationService,
    private readonly mail: MailService,
  ) {}

  // ----------------------------- Helpers -----------------------------

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatFCFA(value: number): string {
    return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
  }

  /** Day string "YYYY-MM-DD" for the given date in the Africa/Douala timezone. */
  private dayString(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  /** Whole-day difference (target - now) compared at day granularity in TZ. */
  private dayDiff(target: Date, now: Date): number {
    const t = Date.parse(`${this.dayString(target)}T00:00:00Z`);
    const n = Date.parse(`${this.dayString(now)}T00:00:00Z`);
    return Math.round((t - n) / 86_400_000);
  }

  /** Add months to a date, clamping to the last valid day of the target month. */
  private addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const lastDay = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
    return d;
  }

  /** Next occurrence date for a recurrence, or null for UNIQUE. */
  computeProchaineDate(
    date: Date,
    recurrence: RecurrenceEcheance,
  ): Date | null {
    switch (recurrence) {
      case 'MENSUELLE':
        return this.addMonths(date, 1);
      case 'TRIMESTRIELLE':
        return this.addMonths(date, 3);
      case 'ANNUELLE':
        return this.addMonths(date, 12);
      default:
        return null;
    }
  }

  // ----------------------------- CRUD -----------------------------

  private async withCoffreSolde(echeance: any) {
    if (!echeance) return echeance;
    if (!echeance.coffreId) {
      return { ...echeance, soldeCoffre: null, manque: null };
    }
    const soldeCoffre = await this.caisseService.calculateSolde(
      echeance.coffreId,
    );
    const cible = this.toNumber(
      echeance.montantCible ?? echeance.coffre?.objectifMontant ?? 0,
    );
    const manque = cible > 0 ? Math.max(0, cible - soldeCoffre) : null;
    return { ...echeance, soldeCoffre, manque };
  }

  async create(dto: CreateEcheanceDto, actor?: NotificationActor) {
    if (dto.coffreId) {
      const coffre = await this.db.coffre.findUnique({
        where: { id: dto.coffreId },
      });
      if (!coffre) {
        throw new NotFoundException(`Coffre avec l'id ${dto.coffreId} non trouve`);
      }
    }

    const echeance = await this.db.echeance.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        coffreId: dto.coffreId ?? null,
        montantCible: dto.montantCible,
        dateEcheance: new Date(dto.dateEcheance),
        recurrence: dto.recurrence,
        joursAlerteAvant: dto.joursAlerteAvant,
        createdById: actor?.id,
      },
      include: { coffre: true },
    });

    this.notifications
      .create('ECHEANCE', `Echeance "${echeance.titre}" creee`, actor)
      .catch(() => {});

    return this.withCoffreSolde(echeance);
  }

  async findAll() {
    const echeances = await this.db.echeance.findMany({
      include: { coffre: true },
      orderBy: { dateEcheance: 'asc' },
    });
    return Promise.all(echeances.map((e) => this.withCoffreSolde(e)));
  }

  async findAVenir(jours = 30) {
    const now = new Date();
    const borne = new Date(now.getTime() + jours * 86_400_000);
    const echeances = await this.db.echeance.findMany({
      where: { active: true, dateEcheance: { lte: borne } },
      include: { coffre: true },
      orderBy: { dateEcheance: 'asc' },
    });
    return Promise.all(echeances.map((e) => this.withCoffreSolde(e)));
  }

  async findOne(id: string) {
    const echeance = await this.db.echeance.findUnique({
      where: { id },
      include: {
        coffre: true,
        alertes: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!echeance) {
      throw new NotFoundException(`Echeance avec l'id ${id} non trouvee`);
    }
    return this.withCoffreSolde(echeance);
  }

  async update(id: string, dto: UpdateEcheanceDto, actor?: NotificationActor) {
    await this.findOne(id);

    if (dto.coffreId) {
      const coffre = await this.db.coffre.findUnique({
        where: { id: dto.coffreId },
      });
      if (!coffre) {
        throw new NotFoundException(`Coffre avec l'id ${dto.coffreId} non trouve`);
      }
    }

    const echeance = await this.db.echeance.update({
      where: { id },
      data: {
        titre: dto.titre,
        description: dto.description,
        coffreId: dto.coffreId,
        montantCible: dto.montantCible,
        dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
        recurrence: dto.recurrence,
        joursAlerteAvant: dto.joursAlerteAvant,
        active: dto.active,
      },
      include: { coffre: true },
    });

    this.notifications
      .create('ECHEANCE', `Echeance "${echeance.titre}" modifiee`, actor)
      .catch(() => {});

    return this.withCoffreSolde(echeance);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.echeance.delete({ where: { id } });
    return { success: true };
  }

  // ------------------------- Moteur d'alertes -------------------------

  /** Build the human-readable alert message for an échéance. */
  private async buildMessage(
    echeance: any,
    type: TypeAlerte,
    joursRestants: number,
  ): Promise<string> {
    const dateStr = new Intl.DateTimeFormat('fr-FR', {
      timeZone: this.TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(echeance.dateEcheance));

    let quand: string;
    if (type === 'URGENT') {
      quand = `c'est aujourd'hui (${dateStr})`;
    } else if (type === 'RETARD') {
      quand = `est en retard (etait prevue le ${dateStr})`;
    } else {
      quand = `dans ${joursRestants} jour(s) (le ${dateStr})`;
    }

    let base = `Echeance "${echeance.titre}" ${quand}.`;

    if (echeance.coffreId) {
      const solde = await this.caisseService.calculateSolde(echeance.coffreId);
      const cible = this.toNumber(
        echeance.montantCible ?? echeance.coffre?.objectifMontant ?? 0,
      );
      const nomCoffre = echeance.coffre?.nom ?? 'lie';
      if (cible > 0) {
        const manque = Math.max(0, cible - solde);
        base +=
          manque > 0
            ? ` Coffre ${nomCoffre}: ${this.formatFCFA(solde)}/${this.formatFCFA(cible)}, il manque ${this.formatFCFA(manque)}.`
            : ` Coffre ${nomCoffre}: objectif atteint (${this.formatFCFA(solde)}).`;
      } else {
        base += ` Coffre ${nomCoffre}: solde ${this.formatFCFA(solde)}.`;
      }
    }

    return base.slice(0, 500);
  }

  private async sendEmailToSuperAdmins(
    titre: string,
    message: string,
  ): Promise<boolean> {
    const superAdmins = await this.db.adminUser.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true },
      select: { email: true },
    });
    if (superAdmins.length === 0) return false;

    const subject = `NEWOTEG — Echeance: ${titre}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2A2FCE; margin: 0 0 16px;">NEWOTEG SARL</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.5;">${message}</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">Message automatique — moteur d'alertes NEWOTEG.</p>
      </div>
    `;

    let any = false;
    for (const admin of superAdmins) {
      const ok = await this.mail.sendMail(admin.email, subject, html);
      any = any || ok;
    }
    return any;
  }

  /**
   * Emit an alert for an échéance: in-app notification (all admins) + email
   * (SUPER_ADMIN only). Idempotent per day via the (echeanceId,type,jour)
   * unique constraint, unless triggered manually.
   */
  async emitAlerte(echeance: any, type: TypeAlerte, opts: EmitOptions = {}) {
    const now = new Date();
    const jour = this.dayString(now);
    const joursRestants =
      opts.joursRestants ?? this.dayDiff(new Date(echeance.dateEcheance), now);
    const message = await this.buildMessage(echeance, type, joursRestants);

    let alerte: any = null;
    try {
      alerte = await this.db.alerteEcheance.create({
        data: {
          echeanceId: echeance.id,
          type,
          message,
          jourEmission: jour,
          declencheManuel: Boolean(opts.manuel),
        },
      });
    } catch (error: any) {
      // P2002 = unique violation -> alert already emitted today.
      if (error?.code === 'P2002') {
        if (!opts.manuel) return null;
        // Manual trigger re-sends notification/email even if a record exists.
      } else {
        throw error;
      }
    }

    await this.notifications.create('ECHEANCE', message, opts.actor).catch(() => {});

    const emailSent = await this.sendEmailToSuperAdmins(echeance.titre, message);
    if (alerte && emailSent) {
      await this.db.alerteEcheance
        .update({ where: { id: alerte.id }, data: { emailEnvoye: true } })
        .catch(() => {});
    }

    await this.db.echeance
      .update({ where: { id: echeance.id }, data: { derniereAlerteLe: now } })
      .catch(() => {});

    return alerte;
  }

  /** Manual trigger from the dashboard ("Lancer l'alerte"). */
  async declencher(id: string, actor?: NotificationActor) {
    const echeance = await this.db.echeance.findUnique({
      where: { id },
      include: { coffre: true },
    });
    if (!echeance) {
      throw new NotFoundException(`Echeance avec l'id ${id} non trouvee`);
    }
    if (!echeance.active) {
      throw new BadRequestException(
        'Cette echeance est inactive; reactivez-la avant de declencher une alerte.',
      );
    }

    const joursRestants = this.dayDiff(new Date(echeance.dateEcheance), new Date());
    const type: TypeAlerte =
      joursRestants > 0 ? 'RAPPEL' : joursRestants === 0 ? 'URGENT' : 'RETARD';

    await this.emitAlerte(echeance, type, { joursRestants, manuel: true, actor });
    return { success: true, type };
  }

  /**
   * Daily job: emit anticipated alerts and roll recurring échéances forward.
   * Idempotent: safe to run multiple times the same day.
   */
  async processDailyAlerts() {
    const now = new Date();
    const echeances = await this.db.echeance.findMany({ where: { active: true } });
    let emitted = 0;

    for (const echeance of echeances) {
      try {
        const joursRestants = this.dayDiff(
          new Date(echeance.dateEcheance),
          now,
        );

        if (joursRestants > 0) {
          const jours = echeance.joursAlerteAvant ?? [];
          if (jours.includes(joursRestants)) {
            await this.emitAlerte(echeance, 'RAPPEL', { joursRestants });
            emitted++;
          }
        } else if (joursRestants === 0) {
          await this.emitAlerte(echeance, 'URGENT', { joursRestants });
          emitted++;
        } else {
          await this.emitAlerte(echeance, 'RETARD', { joursRestants });
          emitted++;

          if (echeance.recurrence === 'UNIQUE') {
            await this.db.echeance.update({
              where: { id: echeance.id },
              data: { active: false },
            });
          } else {
            let next = new Date(echeance.dateEcheance);
            let guard = 0;
            while (this.dayDiff(next, now) < 0 && guard < 120) {
              const computed = this.computeProchaineDate(
                next,
                echeance.recurrence,
              );
              if (!computed) break;
              next = computed;
              guard++;
            }
            await this.db.echeance.update({
              where: { id: echeance.id },
              data: { dateEcheance: next },
            });
          }
        }
      } catch (error: any) {
        this.logger.error(
          `Echeance ${echeance.id} alert processing failed: ${error?.message}`,
        );
      }
    }

    this.logger.log(`Daily alerts processed: ${emitted} alert(s) emitted.`);
    return { emitted };
  }
}
