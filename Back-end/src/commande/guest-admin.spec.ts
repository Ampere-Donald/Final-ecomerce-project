import { GuestOrderService } from './guest-order.service';
import { GuestOrderController } from './guest-order.controller';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';

describe('Administrative guest access', () => {
  const grant = {
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    reason: null,
    version: 1,
  };
  it.each([
    [null, grant, 'ACTIVE', true],
    [null, { ...grant, expiresAt: new Date(0) }, 'EXPIRED', true],
    [null, { ...grant, revokedAt: new Date() }, 'REVOKED', false],
    ['account', grant, 'LINKED', false],
    ['account', null, 'ACCOUNT', false],
    [null, null, 'NO_ACCESS', false],
  ])(
    'summarises state without selecting credentials',
    async (clientId, guestAccess, state, canRevoke) => {
      const findUnique = jest.fn().mockResolvedValue({ clientId, guestAccess });
      const service = new GuestOrderService(
        { commande: { findUnique } } as any,
        { guestRecoveryAvailable: () => false } as any,
      );
      expect(await service.adminStatus('order')).toMatchObject({
        state,
        canRevoke,
        channels: { email: false, sms: false },
      });
      const selection = findUnique.mock.calls[0][0].select.guestAccess.select;
      expect(Object.keys(selection).sort()).toEqual([
        'expiresAt',
        'issuedAt',
        'reason',
        'revokedAt',
        'version',
      ]);
    },
  );
  it('does not misrepresent an unknown order as missing guest access', async () => {
    const service = new GuestOrderService(
      { commande: { findUnique: jest.fn().mockResolvedValue(null) } } as any,
      {} as any,
    );
    await expect(service.adminStatus('unknown')).rejects.toMatchObject({
      status: 404,
    });
  });
  it.each(['adminStatus', 'revoke'])(
    'protects administrative lookup and revocation with roles and private headers',
    (name) => {
      const method = GuestOrderController.prototype[name];
      expect(Reflect.getMetadata('__guards__', method)).toEqual([
        AdminAuthGuard,
        RolesGuard,
      ]);
      expect(Reflect.getMetadata('roles', method)).toEqual([
        'SUPER_ADMIN',
        'ADMIN',
      ]);
      expect(Reflect.getMetadata('__headers__', method)).toEqual(
        expect.arrayContaining([
          { name: 'Cache-Control', value: 'private, no-store' },
        ]),
      );
    },
  );
});
