import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger('AdminAuth');

  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
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
}
