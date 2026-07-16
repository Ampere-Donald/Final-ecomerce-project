import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(
    private readonly db: DatabaseService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email?: string; username?: string; role: string; type: string; sessionVersion?: number }) {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Acces admin requis');
    }
    const admin = await this.db.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive || payload.sessionVersion !== admin.sessionVersion) {
      throw new UnauthorizedException('Compte admin desactive ou introuvable');
    }
    return {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      nom: admin.nom,
      role: admin.role,
      photoUrl: admin.photoUrl,
      type: 'admin',
    };
  }
}
