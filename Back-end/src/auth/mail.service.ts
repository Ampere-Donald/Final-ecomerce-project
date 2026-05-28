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
        // LWS shared hosting presents a *.lwspanel.com certificate for mail.newoteg.com
        // This is standard on shared hosting — the connection is still encrypted via STARTTLS
        tls: { rejectUnauthorized: false },
      });
      this.logger.log('SMTP transporter configured');
    } else {
      this.logger.warn(
        'SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Emails will be logged to console instead.',
      );
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

    this.logger.warn(`[DEV MODE] Email "${subject}" for ${to} not sent (no SMTP).`);
    return false;
  }

  /**
   * Send OTP email. NEVER throws — logs on failure so signup is not broken.
   * Returns true if sent successfully, false if fallback to console.
   */
  async sendOtpEmail(to: string, otp: string, userName: string): Promise<boolean> {
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
          `[SMTP FALLBACK] OTP for ${to}: ${otp}`,
        );
        return false;
      }
    } else {
      this.logger.warn(`[DEV MODE] OTP for ${to}: ${otp}`);
      return false;
    }
  }
}
