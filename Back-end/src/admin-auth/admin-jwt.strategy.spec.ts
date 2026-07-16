import { UnauthorizedException } from '@nestjs/common';
import { AdminJwtStrategy } from './admin-jwt.strategy';

describe('AdminJwtStrategy', () => {
  const activeAdmin = {
    id: 'admin-1',
    email: null,
    username: 'user',
    nom: 'Utilisateur',
    role: 'ADMIN',
    photoUrl: null,
    isActive: true,
    sessionVersion: 3,
  };

  const build = (admin: any = activeAdmin) => new AdminJwtStrategy(
    { adminUser: { findUnique: jest.fn().mockResolvedValue(admin) } } as any,
    { getOrThrow: jest.fn().mockReturnValue('test-secret-at-least-32-characters') } as any,
  );

  it('accepte une session active de même version et relit le rôle en base', async () => {
    await expect(build().validate({
      sub: activeAdmin.id,
      role: 'VENDEUR',
      type: 'admin',
      sessionVersion: 3,
    })).resolves.toMatchObject({ role: 'ADMIN' });
  });

  it('refuse un jeton révoqué', async () => {
    await expect(build().validate({
      sub: activeAdmin.id,
      role: 'ADMIN',
      type: 'admin',
      sessionVersion: 2,
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un compte désactivé', async () => {
    await expect(build({ ...activeAdmin, isActive: false }).validate({
      sub: activeAdmin.id,
      role: 'ADMIN',
      type: 'admin',
      sessionVersion: 3,
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
