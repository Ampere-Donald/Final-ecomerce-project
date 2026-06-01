import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { MailService } from 'src/auth/mail.service';

@Injectable()
export class CaisseJourSchedulerService {
  private readonly logger = new Logger(CaisseJourSchedulerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly mail: MailService,
  ) {}

  /**
   * Boutique ferme à 18h30 ; on alerte à 19h00 (Africa/Douala) si la caisse
   * du jour est toujours ouverte. Notif in-app + email aux SUPER_ADMIN.
   */
  @Cron('0 19 * * *', { timeZone: 'Africa/Douala' })
  async alerteCaisseNonFermee() {
    this.logger.log('Vérification caisse du jour ouverte à 19h00...');
    const ouverte = await this.db.caisseJour.findFirst({
      where: { statut: 'OUVERTE' },
      orderBy: { date: 'desc' },
    });
    if (!ouverte) {
      this.logger.log('Aucune caisse ouverte à signaler.');
      return;
    }

    const dateLabel = ouverte.date.toISOString().slice(0, 10);
    const message = `⚠ Caisse du jour ${dateLabel} non fermée à 19h00 (boutique fermée depuis 18h30).`;

    await this.notifications.create('CAISSE_MAJ', message).catch(() => {});

    const supers = await this.db.adminUser.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true, email: { not: null } },
    });
    for (const a of supers) {
      if (a.email) {
        await this.mail
          .sendMail(
            a.email,
            '⚠ NEWOTEG — Caisse non fermée',
            `<p>Bonjour ${a.nom},</p><p>${message}</p><p>Merci de vérifier ou de fermer manuellement la caisse depuis l'interface.</p>`,
          )
          .catch(() => {});
      }
    }
  }
}
