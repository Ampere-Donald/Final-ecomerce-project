import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  /* ── helpers ────────────────────────────────────────────── */

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private otpExpiry(): Date {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  }

  signToken(client: { id: string; email: string; nom: string }) {
    return this.jwt.sign({ sub: client.id, email: client.email, nom: client.nom });
  }

  /* ── SIGNUP (simplified — no OTP, auto-verified) ─────── */

  async signup(dto: SignupDto) {
    const existing = await this.db.client.findFirst({
      where: { OR: [{ email: dto.email }, ...(dto.telephone ? [{ telephone: dto.telephone }] : [])] },
    });

    if (existing) {
      if (existing.email === dto.email) throw new ConflictException('Cet email est déjà utilisé');
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.motDePasse, 12);

    const client = await this.db.client.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone || null,
        typeClient: (dto.typeClient as any) || 'PARTICULIER',
        motDePasse: hashedPassword,
        emailVerifie: true, // No OTP — directly verified for MVP
      },
    });

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

  /* ── GOOGLE LOGIN ───────────────────────────────────────── */

  async googleLogin(credential: string) {
    // 1. Verify Google ID token
    let payload: any;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token Google invalide');
    }

    if (!payload?.email) {
      throw new BadRequestException('Email manquant dans le profil Google');
    }

    const { email, name, sub: googleId } = payload;

    // 2. Find by googleId OR email
    let client = await this.db.client.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (client) {
      // Link Google ID if not already linked
      if (!client.googleId) {
        client = await this.db.client.update({
          where: { id: client.id },
          data: { googleId },
        });
      }
    } else {
      // 3. Create new client from Google profile
      client = await this.db.client.create({
        data: {
          nom: name || email.split('@')[0],
          email,
          googleId,
          emailVerifie: true,
          typeClient: 'PARTICULIER',
        },
      });
    }

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

    // OTP is logged to console for MVP (no SMTP required)
    console.log(`[RESET PASSWORD] OTP for ${email}: ${otp}`);
    return {
      message: 'Code de réinitialisation généré. Consultez la console du serveur pour le code.',
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
