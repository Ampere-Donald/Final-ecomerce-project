import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminAuthService } from './admin-auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('AdminAuthService login security', () => {
  let db: any;
  let service: AdminAuthService;
  let admin: any;

  beforeEach(() => {
    admin = {
      id: 'admin-1',
      username: 'caissier',
      email: null,
      nom: 'Caissier',
      role: 'CAISSIER',
      isActive: true,
      motDePasse: 'password-hash',
      pinCode: 'pin-hash',
      failedLoginAttempts: 0,
      lockedUntil: null,
      sessionVersion: 0,
      peutVendreSousDemiGros: false,
      photoUrl: null,
      lastLoginAt: null,
    };
    db = {
      adminUser: {
        findFirst: jest.fn().mockResolvedValue(admin),
        update: jest.fn().mockResolvedValue(admin),
      },
    };
    service = new AdminAuthService(
      db,
      { sign: jest.fn().mockReturnValue('jwt') } as any,
      { create: jest.fn() } as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('enregistre une tentative echouee sans exposer la cause', async () => {
    compareMock.mockResolvedValue(false);

    await expect(service.loginWithPassword('caissier', 'incorrect')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(db.adminUser.update).toHaveBeenCalledWith({
      where: { id: admin.id },
      data: { failedLoginAttempts: 1, lockedUntil: null },
    });
  });

  it('verrouille le compte quinze minutes au cinquieme echec', async () => {
    admin.failedLoginAttempts = 4;
    compareMock.mockResolvedValue(false);

    await expect(service.loginWithPin('caissier', '0000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const update = db.adminUser.update.mock.calls[0][0];
    expect(update.data.failedLoginAttempts).toBe(5);
    expect(update.data.lockedUntil).toBeInstanceOf(Date);
    expect(update.data.lockedUntil.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
  });

  it('refuse un compte encore verrouille avant de comparer le secret', async () => {
    admin.lockedUntil = new Date(Date.now() + 60_000);
    await expect(service.loginWithPassword('caissier', 'correct')).rejects.toThrow(
      'Trop de tentatives',
    );
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('reinitialise le verrouillage apres une connexion valide', async () => {
    admin.failedLoginAttempts = 2;
    compareMock.mockResolvedValue(true);

    await expect(service.loginWithPassword('caissier', 'correct')).resolves.toMatchObject({
      access_token: 'jwt',
    });
    expect(db.adminUser.update).toHaveBeenCalledWith({
      where: { id: admin.id },
      data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
    });
  });

  it('inclut la version de session dans le JWT', async () => {
    admin.sessionVersion = 7;
    compareMock.mockResolvedValue(true);
    await service.loginWithPassword('caissier', 'correct');
    expect((service as any).jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sessionVersion: 7 }),
      expect.any(Object),
    );
  });

  it('revoque toutes les sessions en incrementant leur version', async () => {
    await service.revokeSessions(admin.id);
    expect(db.adminUser.update).toHaveBeenCalledWith({
      where: { id: admin.id },
      data: { sessionVersion: { increment: 1 } },
    });
  });
});
