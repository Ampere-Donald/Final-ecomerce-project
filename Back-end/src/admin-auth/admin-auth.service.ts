import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminRole } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger('AdminAuth');

  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.db.adminUser.findUnique({ where: { email } });

    if (!admin) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!admin.isActive) {
      this.logger.warn(`Login attempt on disabled account: ${email}`);
      throw new UnauthorizedException('Compte désactivé');
    }

    const valid = await bcrypt.compare(password, admin.motDePasse);
    if (!valid) {
      this.logger.warn(`Invalid password for admin: ${email}`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Update last login
    await this.db.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: admin.id, email: admin.email, role: admin.role, type: 'admin' };
    this.logger.log(`Admin logged in: ${email} (${admin.role})`);

    return {
      access_token: this.jwt.sign(payload),
      admin: { id: admin.id, nom: admin.nom, email: admin.email, role: admin.role },
    };
  }

  async getMe(adminId: string) {
    const admin = await this.db.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException();
    return { id: admin.id, nom: admin.nom, email: admin.email, role: admin.role };
  }

  async changePassword(adminId: string, oldPassword: string, newPassword: string) {
    const admin = await this.db.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException();

    const valid = await bcrypt.compare(oldPassword, admin.motDePasse);
    if (!valid) throw new BadRequestException('Ancien mot de passe incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db.adminUser.update({
      where: { id: adminId },
      data: { motDePasse: hashed },
    });

    this.logger.log(`Admin password changed: ${admin.email}`);
    return { message: 'Mot de passe modifié avec succès' };
  }

  async seedFirstAdmin(email: string, password: string, nom: string) {
    const count = await this.db.adminUser.count();
    if (count > 0) {
      throw new BadRequestException('Un admin existe déjà. Seed désactivé.');
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await this.db.adminUser.create({
      data: { email, motDePasse: hashed, nom, role: 'SUPER_ADMIN' },
    });

    this.logger.log(`First admin seeded: ${email}`);
    return { id: admin.id, email: admin.email, nom: admin.nom, role: admin.role };
  }

  // ── CRUD Comptes Admin (SUPER_ADMIN only) ──────────────────────────────

  async findAllAdmins() {
    return this.db.adminUser.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdmin(dto: CreateAdminDto, actor: NotificationActor) {
    const existing = await this.db.adminUser.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Un compte avec cet email existe déjà.');
    }

    const hashed = await bcrypt.hash(dto.motDePasse, 12);
    const admin = await this.db.adminUser.create({
      data: {
        email: dto.email,
        motDePasse: hashed,
        nom: dto.nom,
        role: dto.role,
      },
    });

    this.logger.log(`Admin created: ${admin.email} (${admin.role}) by ${actor.nom}`);
    await this.notifications.create(
      'COMPTE_CREE',
      `Nouveau compte ${admin.role} créé : ${admin.nom} (${admin.email})`,
      actor,
    );

    return { id: admin.id, email: admin.email, nom: admin.nom, role: admin.role, isActive: admin.isActive, createdAt: admin.createdAt };
  }

  async updateAdmin(id: string, dto: UpdateAdminDto, actor: NotificationActor) {
    const admin = await this.db.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Compte introuvable');

    const updated = await this.db.adminUser.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        nom: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    this.logger.log(`Admin updated: ${updated.email} by ${actor.nom}`);
    await this.notifications.create(
      'COMPTE_MAJ',
      `Compte ${updated.nom} (${updated.role}) modifié`,
      actor,
    );

    return updated;
  }

  async resetPassword(id: string, newPassword: string, actor: NotificationActor) {
    const admin = await this.db.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Compte introuvable');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db.adminUser.update({
      where: { id },
      data: { motDePasse: hashed },
    });

    this.logger.log(`Password reset for ${admin.email} by ${actor.nom}`);
    await this.notifications.create(
      'COMPTE_MAJ',
      `Mot de passe réinitialisé pour ${admin.nom} (${admin.role})`,
      actor,
    );

    return { message: 'Mot de passe réinitialisé avec succès' };
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

    this.logger.log(`Admin deleted: ${admin.email} by ${actor.nom}`);
    await this.notifications.create(
      'COMPTE_SUPPRIME',
      `Compte ${admin.nom} (${admin.role}) supprimé`,
      actor,
    );

    return { message: 'Compte supprimé' };
  }
}
