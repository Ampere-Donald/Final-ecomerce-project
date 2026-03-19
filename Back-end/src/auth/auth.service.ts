import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { MailService } from './mail.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  /* ── helpers ────────────────────────────────────────────── */

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private otpExpiry(): Date {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  }

  private signToken(client: { id: string; email: string; nom: string }) {
    return this.jwt.sign({ sub: client.id, email: client.email, nom: client.nom });
  }

  /* ── SIGNUP ──────────────────────────────────────────────── */

  async signup(dto: SignupDto) {
    // Check if account already exists
    const existing = await this.db.client.findFirst({
      where: { OR: [{ email: dto.email }, ...(dto.telephone ? [{ telephone: dto.telephone }] : [])] },
    });

    if (existing) {
      // If an unverified account exists with the same email, refresh OTP and re-send
      if (!existing.emailVerifie && existing.email === dto.email) {
        const otp = this.generateOtp();
        await this.db.client.update({
          where: { id: existing.id },
          data: { otpCode: otp, otpExpiresAt: this.otpExpiry() },
        });

        const emailSent = await this.mail.sendOtpEmail(dto.email, otp, existing.nom);

        return {
          message: emailSent
            ? 'Un compte non vérifié existe déjà avec cet email. Un nouveau code OTP a été envoyé.'
            : 'Un compte non vérifié existe déjà. Consultez la console du serveur pour le code OTP.',
          email: existing.email,
        };
      }

      // Otherwise it's a real conflict on a verified or phone-only duplicate
      if (existing.email === dto.email) throw new ConflictException('Cet email est déjà utilisé');
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }

    // Create new account
    const hashedPassword = await bcrypt.hash(dto.motDePasse, 12);
    const otp = this.generateOtp();

    const client = await this.db.client.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone || null,
        typeClient: (dto.typeClient as any) || 'PARTICULIER',
        motDePasse: hashedPassword,
        emailVerifie: false,
        otpCode: otp,
        otpExpiresAt: this.otpExpiry(),
      },
    });

    // Send OTP — this NEVER throws now (handled gracefully in MailService)
    const emailSent = await this.mail.sendOtpEmail(dto.email, otp, dto.nom);

    return {
      message: emailSent
        ? 'Compte créé. Vérifiez votre email pour le code OTP.'
        : 'Compte créé. SMTP indisponible — consultez la console du serveur pour le code OTP.',
      email: client.email,
    };
  }

  /* ── VERIFY OTP ─────────────────────────────────────────── */

  async verifyOtp(dto: VerifyOtpDto) {
    const client = await this.db.client.findFirst({ where: { email: dto.email } });
    if (!client) throw new NotFoundException('Aucun compte avec cet email');
    if (client.emailVerifie) throw new BadRequestException('Email déjà vérifié');
    if (!client.otpCode || !client.otpExpiresAt) throw new BadRequestException('Aucun OTP en attente');
    if (new Date() > client.otpExpiresAt) throw new BadRequestException('OTP expiré. Demandez un nouveau code.');
    if (client.otpCode !== dto.code) throw new BadRequestException('Code OTP incorrect');

    await this.db.client.update({
      where: { id: client.id },
      data: { emailVerifie: true, otpCode: null, otpExpiresAt: null },
    });

    return { message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' };
  }

  /* ── RESEND OTP ─────────────────────────────────────────── */

  async resendOtp(email: string) {
    const client = await this.db.client.findFirst({ where: { email } });
    if (!client) throw new NotFoundException('Aucun compte avec cet email');
    if (client.emailVerifie) throw new BadRequestException('Email déjà vérifié');

    // Cooldown: if OTP was sent less than 60s ago
    if (client.otpExpiresAt) {
      const sentAgo = Date.now() - (client.otpExpiresAt.getTime() - 10 * 60 * 1000);
      if (sentAgo < 60 * 1000) {
        throw new BadRequestException('Veuillez patienter 60 secondes avant de renvoyer le code.');
      }
    }

    const otp = this.generateOtp();
    await this.db.client.update({
      where: { id: client.id },
      data: { otpCode: otp, otpExpiresAt: this.otpExpiry() },
    });

    const emailSent = await this.mail.sendOtpEmail(email, otp, client.nom);
    return {
      message: emailSent
        ? 'Nouveau code OTP envoyé.'
        : 'OTP régénéré. SMTP indisponible — consultez la console du serveur.',
    };
  }

  /* ── LOGIN ──────────────────────────────────────────────── */

  async login(dto: LoginDto) {
    const identifiant = dto.identifiant.trim();
    const isEmail = identifiant.includes('@');

    const client = await this.db.client.findFirst({
      where: isEmail ? { email: identifiant } : { telephone: identifiant },
    });

    if (!client || !client.motDePasse) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!client.emailVerifie) {
      throw new UnauthorizedException('Veuillez vérifier votre email avant de vous connecter.');
    }

    const valid = await bcrypt.compare(dto.motDePasse, client.motDePasse);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    const token = this.signToken(client as any);

    return {
      access_token: token,
      user: {
        id: client.id,
        nom: client.nom,
        email: client.email,
        telephone: client.telephone,
        typeClient: client.typeClient,
      },
    };
  }

  /* ── ME (current user) ─────────────────────────────────── */

  async getMe(userId: string) {
    const client = await this.db.client.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        typeClient: true,
        emailVerifie: true,
        adresse: true,
      },
    });
    if (!client) throw new NotFoundException('Utilisateur non trouvé');
    return client;
  }

  /* ── FORGOT PASSWORD ───────────────────────────────────── */

  async forgotPassword(email: string) {
    const client = await this.db.client.findFirst({ where: { email } });
    if (!client) throw new NotFoundException('Aucun compte avec cet email');

    const otp = this.generateOtp();
    await this.db.client.update({
      where: { id: client.id },
      data: { otpCode: otp, otpExpiresAt: this.otpExpiry() },
    });

    const emailSent = await this.mail.sendOtpEmail(email, otp, client.nom);
    return {
      message: emailSent
        ? 'Code de réinitialisation envoyé par email.'
        : 'Code généré. SMTP indisponible — consultez la console du serveur.',
    };
  }

  /* ── RESET PASSWORD ────────────────────────────────────── */

  async resetPassword(email: string, code: string, newPassword: string) {
    const client = await this.db.client.findFirst({ where: { email } });
    if (!client) throw new NotFoundException('Aucun compte avec cet email');
    if (!client.otpCode || !client.otpExpiresAt) throw new BadRequestException('Aucun OTP en attente');
    if (new Date() > client.otpExpiresAt) throw new BadRequestException('Code expiré');
    if (client.otpCode !== code) throw new BadRequestException('Code incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db.client.update({
      where: { id: client.id },
      data: { motDePasse: hashed, otpCode: null, otpExpiresAt: null },
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}
