import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('SMTP transporter configured');
    } else {
      this.logger.warn(
        'SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Emails will not be sent.',
      );
    }
  }

  guestRecoveryAvailable(): boolean {
    return process.env.GUEST_EMAIL_ENABLED === 'true' && !!this.transporter;
  }

  async sendGuestReviewCode(
    to: string,
    code: string,
    reference: string,
    product: string,
  ): Promise<boolean> {
    if (!this.guestRecoveryAvailable() || !/^\d{8}$/.test(code)) return false;
    try {
      await this.transporter!.sendMail({
        from: process.env.SMTP_FROM || '"NEWOTEG SARL" <noreply@newoteg.com>',
        to,
        subject: 'NEWOTEG — Confirmer votre avis sur un article reçu',
        text: `Votre code est ${code}. Il autorise uniquement l’enregistrement de votre avis sur ${product}, commande ${reference}. L’avis et le pseudonyme choisis seront publiés après modération. Il expire dans 10 minutes et ne peut être utilisé qu’une fois. Ne le partagez pas. Si vous n’avez pas demandé cet avis, ignorez ce message. Ce code n’autorise aucun paiement ni modification de commande.`,
      });
      return true;
    } catch {
      this.logger.warn('Guest review code could not be delivered.');
      return false;
    }
  }

  /** Private recovery: opt-in, no code, recipient or transport error in logs. */
  async sendGuestAccessCode(to: string, code: string): Promise<boolean> {
    if (!this.guestRecoveryAvailable() || !/^\d{8}$/.test(code)) return false;
    try {
      await this.transporter!.sendMail({
        from: process.env.SMTP_FROM || '"NEWOTEG SARL" <noreply@newoteg.com>',
        to,
        subject: 'NEWOTEG — Retrouver le suivi de votre commande',
        text: `Votre code de suivi privé est ${code}. Il expire dans 10 minutes et ne peut être utilisé qu’une fois. Ne le partagez pas. Si vous n’avez pas demandé ce code, ignorez ce message. Ce code permet uniquement de consulter le suivi ; il ne valide aucun paiement.`,
      });
      return true;
    } catch {
      this.logger.warn('Guest recovery email could not be delivered.');
      return false;
    }
  }

  /** Explicit consent: this code cannot be used for read-access recovery. */
  async sendGuestLinkCode(
    to: string,
    code: string,
    reference: string,
    accountEmail: string,
  ): Promise<boolean> {
    if (!this.guestRecoveryAvailable() || !/^\d{8}$/.test(code)) return false;
    try {
      await this.transporter!.sendMail({
        from: process.env.SMTP_FROM || '"NEWOTEG SARL" <noreply@newoteg.com>',
        to,
        subject: 'NEWOTEG — Rattacher votre commande à un compte',
        text: `Votre code est ${code}. Il autorise le rattachement de la commande ${reference} au compte ${accountEmail}. Ce compte pourra consulter les coordonnées et gérer cette commande. Le lien de suivi invité sera désactivé. Le code expire dans 10 minutes et ne peut être utilisé qu’une fois. Ne le partagez pas. Si vous n’avez pas demandé ce rattachement, ignorez ce message. Aucun paiement n’est effectué.`,
      });
      return true;
    } catch {
      this.logger.warn('Guest linking email could not be delivered.');
      return false;
    }
  }

  async sendGuestActionCode(
    to: string,
    code: string,
    reference: string,
    action: 'CANCEL' | 'RECEIVE',
  ): Promise<boolean> {
    if (
      !this.guestRecoveryAvailable() ||
      !/^\d{8}$/.test(code) ||
      !['CANCEL', 'RECEIVE'].includes(action)
    )
      return false;
    const description =
      action === 'CANCEL'
        ? 'annuler votre commande et remettre les articles en stock'
        : 'confirmer que vous avez reçu tous les articles de votre livraison';
    try {
      await this.transporter!.sendMail({
        from: process.env.SMTP_FROM || '"NEWOTEG SARL" <noreply@newoteg.com>',
        to,
        subject:
          action === 'CANCEL'
            ? 'NEWOTEG — Annulation de votre commande'
            : 'NEWOTEG — Confirmation de réception',
        text: `Votre code est ${code}. Il autorise uniquement à ${description} pour la commande ${reference}. Il expire dans 10 minutes et ne peut être utilisé qu’une fois. Ne le partagez pas. Si vous n’avez pas demandé cette action, ignorez ce message. Ce code n’autorise aucun paiement et ne rattache pas la commande à un compte.`,
      });
      return true;
    } catch {
      this.logger.warn('Guest order action email could not be delivered.');
      return false;
    }
  }

  /**
   * Generic email sender. NEVER throws — logs on failure so callers
   * (e.g. the échéance alert engine) are not broken by SMTP issues.
   * Returns true if sent successfully, false otherwise.
   */
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!to) return false;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: '"NEWOTEG SARL" <noreply@newoteg.com>',
          to,
          subject,
          html,
        });
        this.logger.log(`Email "${subject}" sent to ${to}`);
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send email "${subject}" to ${to}: ${error.message}`,
        );
        return false;
      }
    }

    this.logger.warn(
      `[DEV MODE] Email "${subject}" for ${to} not sent (no SMTP).`,
    );
    return false;
  }

  /**
   * Send OTP email. NEVER throws — logs on failure so signup is not broken.
   * Returns true if sent successfully, false if fallback to console.
   */
  async sendOtpEmail(
    to: string,
    otp: string,
    userName: string,
  ): Promise<boolean> {
    const subject = 'NEWOTEG SARL — Code de vérification';
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8f9fa; border-radius: 12px;">
        <h2 style="color: #2A2FCE; margin: 0 0 8px;">NEWOTEG SARL</h2>
        <p style="color: #374151; margin: 0 0 24px;">Bonjour <strong>${userName}</strong>,</p>
        <p style="color: #374151; margin: 0 0 16px;">Voici votre code de vérification :</p>
        <div style="background: #2A2FCE; color: #fff; font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; border-radius: 8px; margin: 0 0 24px;">
          ${otp}
        </div>
        <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px;">Ce code expire dans <strong>10 minutes</strong>.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
          Ceci est un message automatique envoyé depuis <strong>noreply@newoteg.com</strong>.<br/>
          <strong>Veuillez ne pas répondre à cet email.</strong><br/>
          Si vous n'avez pas demandé ce code, vous pouvez ignorer ce message.
        </p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: '"NEWOTEG SARL" <noreply@newoteg.com>',
          to,
          subject,
          html,
        });
        this.logger.log(`OTP email sent to ${to}`);
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send OTP email to ${to}: ${error.message}`,
        );
        this.logger.warn(
          `OTP delivery failed for ${to}; the code was not logged.`,
        );
        return false;
      }
    } else {
      this.logger.warn(
        `OTP for ${to} was not sent because SMTP is not configured; the code was not logged.`,
      );
      return false;
    }
  }
}
