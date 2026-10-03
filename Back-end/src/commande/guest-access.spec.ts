import { randomBytes, randomUUID } from 'crypto';
import {
  attachGuestAccess,
  guestTokenHash,
  validateGuestAccessRequest,
} from './guest-access';
import { GuestOrderService } from './guest-order.service';
import { GuestOrderController } from './guest-order.controller';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';

const key = randomBytes(32).toString('base64url');
const dto: any = {
  requestId: randomUUID(),
  guestAccessKey: key,
  guestEmail: 'Guest@Example.invalid',
};
describe('Private guest order access', () => {
  it('requires canonical 256-bit tokens, rejecting aliases and malformed keys', () => {
    expect(guestTokenHash(key)).toMatch(/^[a-f0-9]{64}$/);
    for (const value of [
      null,
      123,
      key + '=',
      key.slice(1),
      'A'.repeat(42) + 'B',
      '!'.repeat(43),
    ])
      expect(guestTokenHash(value)).toBeNull();
  });
  it('requires a durable UUID attempt for guest access, and a key for recovery email', () => {
    expect(() => validateGuestAccessRequest(dto)).not.toThrow();
    expect(() =>
      validateGuestAccessRequest({ guestAccessKey: key } as any),
    ).toThrow();
    expect(() =>
      validateGuestAccessRequest({ guestEmail: 'g@example.invalid' } as any),
    ).toThrow();
    expect(() => validateGuestAccessRequest({} as any)).not.toThrow();
  });
  it('persists only a digest, normalised email and fixed expiry inside the order transaction', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve(data));
    const result = await attachGuestAccess(
      { commandeGuestAccess: { create } },
      dto,
      { id: 'order' },
      false,
    );
    const saved = create.mock.calls[0][0].data;
    expect(saved.tokenHash).toBe(guestTokenHash(key));
    expect(saved.recoveryEmail).toBe('guest@example.invalid');
    expect(JSON.stringify(saved)).not.toContain(key);
    expect(Object.keys(result.guestAccess).sort()).toEqual([
      'expiresAt',
      'scope',
    ]);
    expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      29 * 86400000,
    );
  });
  it('replays the same expiry without writing or extending access', async () => {
    const expiresAt = new Date(Date.now() + 100000);
    const tx = {
      commandeGuestAccess: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ tokenHash: guestTokenHash(key), expiresAt }),
        create: jest.fn(),
      },
    };
    const result = await attachGuestAccess(tx, dto, { id: 'order' }, true);
    expect(result.guestAccess.expiresAt).toBe(expiresAt);
    expect(tx.commandeGuestAccess.create).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { tokenHash: 'wrong', expiresAt: new Date(Date.now() + 100000) },
    { tokenHash: guestTokenHash(key), expiresAt: new Date(0) },
    {
      tokenHash: guestTokenHash(key),
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: new Date(),
    },
  ])(
    'blocks missing, rotated, expired and revoked grants on order replay',
    async (grant) => {
      await expect(
        attachGuestAccess(
          {
            commandeGuestAccess: {
              findUnique: jest.fn().mockResolvedValue(grant),
            },
          },
          dto,
          { id: 'order' },
          true,
        ),
      ).rejects.toMatchObject({
        response: { code: 'GUEST_ACCESS_UNAVAILABLE' },
      });
    },
  );
  it('blocks the old guest replay after account linking', async () => {
    await expect(
      attachGuestAccess({}, dto, { id: 'order', clientId: 'account' }, true),
    ).rejects.toMatchObject({ response: { code: 'GUEST_ACCESS_UNAVAILABLE' } });
    await expect(
      attachGuestAccess(
        {},
        { ...dto, clientId: 'account' },
        { id: 'order', clientId: 'account' },
        true,
      ),
    ).resolves.toEqual({ id: 'order', clientId: 'account' });
  });
  it('rejects key reuse so the order transaction can roll back', async () => {
    await expect(
      attachGuestAccess(
        {
          commandeGuestAccess: {
            create: jest
              .fn()
              .mockRejectedValue(
                Object.assign(new Error('Duplicate'), { code: 'P2002' }),
              ),
          },
        },
        dto,
        { id: 'order' },
        false,
      ),
    ).rejects.toMatchObject({ response: { code: 'GUEST_KEY_REUSED' } });
  });
  it('exposes historical lines and status without identity, costs or recovery address', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      expiresAt: new Date(),
      recoveryEmail: 'private@example.invalid',
      commande: {
        id: 'o',
        nomClient: 'SECRET NAME',
        telephone: 'SECRET PHONE',
        adresseLivraison: 'SECRET ADDRESS',
        clientId: null,
        statut: 'EN_ATTENTE',
        lignes: [
          {
            nomProduit: 'Cable',
            prixUnitaire: 2800,
            produit: { nomProduit: 'Cable', cmupActuel: 'SECRET COST' },
          },
        ],
      },
    });
    const service = new GuestOrderService(
      { commandeGuestAccess: { findFirst } } as any,
      { guestRecoveryAvailable: () => false } as any,
    );
    const result = await service.read(key),
      json = JSON.stringify(result);
    for (const value of [
      'SECRET',
      'private@example.invalid',
      'tokenHash',
      'recoveryEmail',
    ])
      expect(json).not.toContain(value);
    expect(result.access.canCancel).toBe(false);
    expect(result.commande.lignes[0].prixUnitaire).toBe(2800);
    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      tokenHash: guestTokenHash(key),
      revokedAt: null,
      commande: { clientId: null },
    });
  });
  it('returns a uniform unavailable response, and makes no query for invalid tokens', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new GuestOrderService(
      { commandeGuestAccess: { findFirst } } as any,
      {} as any,
    );
    await expect(service.read('invalid')).rejects.toMatchObject({
      status: 401,
      response: { code: 'GUEST_ACCESS_UNAVAILABLE' },
    });
    expect(findFirst).not.toHaveBeenCalled();
    await expect(service.read(key)).rejects.toMatchObject({
      status: 401,
      response: { code: 'GUEST_ACCESS_UNAVAILABLE' },
    });
  });
  it('requires admin identity and authorised role for revocation', () => {
    const method = Object.getOwnPropertyDescriptor(
      GuestOrderController.prototype,
      'revoke',
    )!.value;
    expect(Reflect.getMetadata('__guards__', method)).toEqual([
      AdminAuthGuard,
      RolesGuard,
    ]);

    expect(Reflect.getMetadata('roles', method)).toEqual([
      'SUPER_ADMIN',
      'ADMIN',
    ]);
  });
  it('announces email unavailability honestly without lookup or sending', async () => {
    const db = { $transaction: jest.fn() },
      mail = {
        guestRecoveryAvailable: () => false,
        sendGuestAccessCode: jest.fn(),
      };
    const service = new GuestOrderService(db as any, mail as any);
    expect(
      await service.requestRecovery('CMD-UNKNOWN', 'x@example.invalid'),
    ).toMatchObject({ available: false });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mail.sendGuestAccessCode).not.toHaveBeenCalled();
  });
});
