import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, AdminUser } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { ActivityLogService } from './activity-log.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger('AdminAuth');
  private static readonly MAX_FAILED_LOGINS = 5;
  private static readonly LOCK_DURATION_MS = 15 * 60 * 1000;

  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async login(username: string, password?: string, pin?: string) {
    if (pin) return this.loginWithPin(username, pin);
    if (!password) throw new UnauthorizedException("Le mot de passe est requis");
    return this.loginWithPassword(username, password);
  }

  async loginWithPassword(username: string, password: string) {
    const admin = await this.findByUsernameOrEmail(username);

    if (!admin) {
      this.logger.warn(`Failed login attempt for username: ${username}`);
      throw new UnauthorizedException("Nom d'utilisateur ou mot de passe incorrect");
    }

    if (!admin.isActive) {
      this.logger.warn(`Login attempt on disabled account: ${admin.username}`);
      throw new UnauthorizedException('Compte desactive');
    }

    this.assertNotLocked(admin);

    if (!admin.motDePasse) {
      throw new UnauthorizedException('Ce compte ne peut pas se connecter par mot de passe');
    }

    const valid = await bcrypt.compare(password, admin.motDePasse);
    if (!valid) {
      await this.recordFailedLogin(admin);
      this.logger.warn(`Invalid password for admin: ${admin.username}`);
      throw new UnauthorizedException("Nom d'utilisateur ou mot de passe incorrect");
    }

    await this.recordSuccessfulLogin(admin.id);
    await this.activityLog.log(admin.id, 'LOGIN_PASSWORD');

    this.logger.log(`Admin logged in: ${admin.username} (${admin.role})`);
    return this.issueJwt(admin, '24h');
  }

  async loginWithPin(username: string, pin: string) {
    const admin = await this.findByUsernameOrEmail(username);

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    this.assertNotLocked(admin);

    if (!admin.pinCode) {
      throw new UnauthorizedException("Ce compte n'a pas de PIN configure");
    }

    if (!['CAISSIER', 'VENDEUR'].includes(admin.role)) {
      throw new UnauthorizedException("Le PIN n'est autorise que pour le personnel de boutique");
    }

    const valid = await bcrypt.compare(pin, admin.pinCode);
    if (!valid) {
      await this.recordFailedLogin(admin);
      throw new UnauthorizedException('Identifiants invalides');
    }

    await this.recordSuccessfulLogin(admin.id);
    await this.activityLog.log(admin.id, 'LOGIN_PIN');

    this.logger.log(`PIN login: ${admin.username} (${admin.role})`);
    return this.issueJwt(admin, '4h');
  }

  async getMe(adminId: string) {
    const admin = await this.db.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException();
    return this.serializeAdmin(admin);
  }

  async changePassword(adminId: string, oldPassword: string, newPassword: string) {
    const admin = await this.db.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException();
    if (!admin.motDePasse) throw new BadRequestException('Ce compte ne possede pas de mot de passe');

    const valid = await bcrypt.compare(oldPassword, admin.motDePasse);
    if (!valid) throw new BadRequestException('Ancien mot de passe incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db.adminUser.update({
      where: { id: adminId },
      data: { motDePasse: hashed },
    });
    await this.activityLog.log(admin.id, 'PASSWORD_CHANGED');

    this.logger.log(`Admin password changed: ${admin.username}`);
    return { message: 'Mot de passe modifie avec succes' };
  }

  async findAllAdmins() {
    return this.db.adminUser.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        nom: true,
        photoUrl: true,
        role: true,
        isActive: true,
        peutVendreSousDemiGros: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdmin(dto: CreateAdminDto, actor: NotificationActor) {
    const username = this.normalizeUsername(dto.username || this.usernameFromEmail(dto.email) || dto.nom);
    const existingUsername = await this.db.adminUser.findUnique({ where: { username } });
    if (existingUsername) {
      throw new ConflictException("Ce nom d'utilisateur existe deja.");
    }

    if (dto.email) {
      const existingEmail = await this.db.adminUser.findUnique({ where: { email: dto.email } });
      if (existingEmail) throw new ConflictException('Un compte avec cet email existe deja.');
    }

    const isPinRole = ['CAISSIER', 'VENDEUR'].includes(dto.role);
    if (isPinRole && !dto.pin) throw new BadRequestException('Le PIN est requis pour ce role.');
    if (!isPinRole && !dto.motDePasse) throw new BadRequestException('Le mot de passe est requis pour ce role.');

    const admin = await this.db.adminUser.create({
      data: {
        email: dto.email || null,
        username,
        motDePasse: dto.motDePasse ? await bcrypt.hash(dto.motDePasse, 12) : null,
        pinCode: dto.pin ? await bcrypt.hash(dto.pin, 10) : null,
        nom: dto.nom,
        photoUrl: dto.photoUrl,
        role: dto.role,
        createdById: actor.id,
      },
    });

    this.logger.log(`Admin created: ${admin.username} (${admin.role}) by ${actor.nom}`);
    await this.activityLog.log(actor.id, 'ADMIN_CREATE', { adminId: admin.id, username: admin.username, role: admin.role });
    await this.notifications.create(
      'COMPTE_CREE',
      `Nouveau compte ${admin.role} cree : ${admin.nom} (${admin.username})`,
      actor,
    );

    return this.serializeAdmin(admin);
  }

  async updateAdmin(id: string, dto: UpdateAdminDto, actor: NotificationActor) {
    const admin = await this.db.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Compte introuvable');

    const data: any = { ...dto };
    delete data.motifRole;
    if (dto.username) {
      data.username = this.normalizeUsername(dto.username);
      const existing = await this.db.adminUser.findUnique({ where: { username: data.username } });
      if (existing && existing.id !== id) throw new ConflictException("Ce nom d'utilisateur existe deja.");
    }
    if (dto.motDePasse) {
      data.motDePasse = await bcrypt.hash(dto.motDePasse, 12);
    }
    if (dto.pin) {
      data.pinCode = await bcrypt.hash(dto.pin, 10);
      delete data.pin;
    }

    const roleChanged = dto.role && dto.role !== admin.role;
    const updated = await this.db.$transaction(async (tx) => {
      const saved = await tx.adminUser.update({
        where: { id },
        data,
      });

      if (roleChanged) {
        await tx.roleHistory.create({
          data: {
            adminUserId: id,
            oldRole: admin.role,
            newRole: dto.role as AdminRole,
            changedById: actor.id,
            motif: dto.motifRole,
          },
        });
      }

      return saved;
    });

    this.logger.log(`Admin updated: ${updated.username} by ${actor.nom}`);
    await this.activityLog.log(actor.id, 'ADMIN_UPDATE', { adminId: updated.id, roleChanged });
    await this.notifications.create('COMPTE_MAJ', `Compte ${updated.nom} (${updated.role}) modifie`, actor);

    return this.serializeAdmin(updated);
  }

  async resetPassword(id: string, newPassword: string, actor: NotificationActor) {
    const admin = await this.db.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Compte introuvable');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db.adminUser.update({
      where: { id },
      data: { motDePasse: hashed },
    });

    this.logger.log(`Password reset for ${admin.username} by ${actor.nom}`);
    await this.activityLog.log(actor.id, 'ADMIN_PASSWORD_RESET', { adminId: admin.id });
    await this.notifications.create('COMPTE_MAJ', `Mot de passe reinitialise pour ${admin.nom} (${admin.role})`, actor);

    return { message: 'Mot de passe reinitialise avec succes' };
  }

  async toggleActive(id: string, currentAdminId: string, actor: NotificationActor) {
    if (id === currentAdminId) {
      throw new ForbiddenException('Vous ne pouvez pas desactiver votre propre compte.');
    }
    const admin = await this.db.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Compte introuvable');

    const updated = await this.db.adminUser.update({
      where: { id },
      data: { isActive: !admin.isActive },
    });

    this.logger.log(
      `Admin ${updated.isActive ? 'activated' : 'deactivated'}: ${updated.username} by ${actor.nom}`,
    );
    await this.activityLog.log(actor.id, updated.isActive ? 'ADMIN_ACTIVATE' : 'ADMIN_DEACTIVATE', {
      adminId: updated.id,
    });
    await this.notifications.create(
      'COMPTE_MAJ',
      `Compte ${updated.nom} ${updated.isActive ? 'reactivé' : 'desactivé'}`,
      actor,
    );

    return this.serializeAdmin(updated);
  }

  async getActivityLog(adminId: string, limit = 50) {
    const admin = await this.db.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Compte introuvable');
    return this.activityLog.list(adminId, limit);
  }

  async getRoleHistory(adminId: string) {
    const admin = await this.db.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Compte introuvable');
    return this.db.roleHistory.findMany({
      where: { adminUserId: adminId },
      orderBy: { changedAt: 'desc' },
    });
  }

  async changerRole(id: string, role: AdminRole) {
    const admin = await this.db.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Employe introuvable');
    return this.db.adminUser.update({
      where: { id },
      data: { role },
      select: { id: true, nom: true, email: true, role: true, isActive: true },
    });
  }

  async deleteAdmin(id: string, currentAdminId: string, actor: NotificationActor) {
    if (id === currentAdminId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte.');
    }

    const admin = await this.db.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Compte introuvable');

    await this.db.adminUser.delete({ where: { id } });

    this.logger.log(`Admin deleted: ${admin.username} by ${actor.nom}`);
    await this.activityLog.log(actor.id, 'ADMIN_DELETE', { adminId: admin.id, username: admin.username });
    await this.notifications.create('COMPTE_SUPPRIME', `Compte ${admin.nom} (${admin.role}) supprime`, actor);

    return { message: 'Compte supprime' };
  }

  private async findByUsernameOrEmail(usernameOrEmail: string) {
    const value = usernameOrEmail.trim();
    const normalized = this.normalizeUsername(value);
    return this.db.adminUser.findFirst({
      where: {
        OR: [{ username: normalized }, { email: value.toLowerCase() }],
      },
    });
  }

  private assertNotLocked(admin: AdminUser): void {
    if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException('Trop de tentatives. Reessayez dans 15 minutes.');
    }
  }

  private async recordFailedLogin(admin: AdminUser): Promise<void> {
    const previousAttempts = admin.lockedUntil && admin.lockedUntil.getTime() <= Date.now()
      ? 0
      : admin.failedLoginAttempts;
    const failedLoginAttempts = previousAttempts + 1;
    const lockedUntil = failedLoginAttempts >= AdminAuthService.MAX_FAILED_LOGINS
      ? new Date(Date.now() + AdminAuthService.LOCK_DURATION_MS)
      : null;

    await this.db.adminUser.update({
      where: { id: admin.id },
      data: { failedLoginAttempts, lockedUntil },
    });
  }

  private async recordSuccessfulLogin(adminId: string): Promise<void> {
    await this.db.adminUser.update({
      where: { id: adminId },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  private issueJwt(admin: AdminUser, expiresIn: string) {
    const payload = {
      sub: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      nom: admin.nom,
      type: 'admin',
    };
    const accessToken = this.jwt.sign(payload, { expiresIn: expiresIn as any });
    return {
      access_token: accessToken,
      token: accessToken,
      admin: this.serializeAdmin(admin),
      user: this.serializeAdmin(admin),
    };
  }

  private serializeAdmin(admin: AdminUser) {
    return {
      id: admin.id,
      nom: admin.nom,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      photoUrl: admin.photoUrl,
      isActive: admin.isActive,
      peutVendreSousDemiGros: admin.peutVendreSousDemiGros,
      lastLoginAt: admin.lastLoginAt,
    };
  }

  private usernameFromEmail(email?: string | null) {
    return email?.split('@')[0];
  }

  private normalizeUsername(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);
    return normalized || `admin_${Date.now().toString(36)}`;
  }
}
