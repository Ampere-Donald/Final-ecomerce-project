import { randomBytes, randomUUID, createHmac } from 'crypto';
import { GuestLinkService } from './guest-link.service';
import { GuestLinkController } from './guest-link.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { guestTokenHash } from './guest-access';

describe('Guest account linking consent', () => {
  const previous = process.env.JWT_SECRET;
  beforeEach(() => {
    process.env.JWT_SECRET = 'local-unit-secret';
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  const token = () => randomBytes(32).toString('base64url');

  it('keeps linking disabled without an email provider and performs no lookup/send', async () => {
    const db = { $transaction: jest.fn() },
      mail = {
        guestRecoveryAvailable: () => false,
        sendGuestLinkCode: jest.fn(),
      };
    const service = new GuestLinkService(db as any, mail as any);
    await expect(service.request(token(), 'client')).resolves.toMatchObject({
      available: false,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mail.sendGuestLinkCode).not.toHaveBeenCalled();
  });
  it('protects both routes with account authentication', () => {
    expect(Reflect.getMetadata('__guards__', GuestLinkController)).toEqual([
      JwtAuthGuard,
    ]);
    for (const name of ['request', 'link']) {
      const handler = Object.getOwnPropertyDescriptor(
        GuestLinkController.prototype,
        name,
      )!.value;
      expect(Reflect.getMetadata('__headers__', handler)).toEqual(
        expect.arrayContaining([
          { name: 'Cache-Control', value: 'private, no-store' },
          { name: 'Referrer-Policy', value: 'no-referrer' },
        ]),
      );
    }
  });
  it('rejects malformed capabilities before querying the database', async () => {
    const db = { $transaction: jest.fn() };
    await expect(
      new GuestLinkService(db as any, {} as any).link(
        'bad',
        randomUUID(),
        token(),
        'client',
        '12345678',
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('never accepts a recovery challenge or a code bound to another account', async () => {
    for (const challenge of [
      { purpose: 'RECOVER', targetClientId: 'client' },
      { purpose: 'LINK', targetClientId: 'other' },
    ]) {
      const tx = {
        commandeGuestChallenge: {
          findUnique: jest.fn().mockResolvedValue(challenge),
        },
        $queryRaw: jest.fn(),
      };
      const db = { $transaction: (fn: any) => fn(tx) };
      await expect(
        new GuestLinkService(db as any, {} as any).link(
          token(),
          randomUUID(),
          token(),
          'client',
          '12345678',
        ),
      ).rejects.toMatchObject({ response: { code: 'GUEST_LINK_INVALID' } });
      expect(tx.$queryRaw).not.toHaveBeenCalled();
    }
  });
  it('commits failed attempts and consumes the fifth failure without linking', async () => {
    const key = token(),
      actionKey = token(),
      id = randomUUID();
    const challenge: any = {
      id,
      commandeId: 'order',
      purpose: 'LINK',
      targetClientId: 'client',
      delivered: true,
      expiresAt: new Date(Date.now() + 600000),
      attempts: 0,
      codeHash: createHmac('sha256', process.env.JWT_SECRET!)
        .update(`LINK:${id}:12345678`)
        .digest('hex'),
    };
    const grant = {
      tokenHash: guestTokenHash(key),
      expiresAt: new Date(Date.now() + 600000),
      commande: { clientId: null },
    };
    const update = jest.fn().mockImplementation(({ data }) => {
      challenge.attempts++;
      if (data.consumedAt) challenge.consumedAt = data.consumedAt;
      return Promise.resolve(challenge);
    });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      commandeGuestChallenge: {
        findUnique: jest.fn().mockResolvedValue(challenge),
        update,
      },
      commandeGuestAccess: { findUnique: jest.fn().mockResolvedValue(grant) },
      commande: { updateMany: jest.fn() },
    };
    const db = { $transaction: (fn: any) => fn(tx) };
    const service = new GuestLinkService(db as any, {} as any);
    for (let i = 0; i < 6; i++)
      await expect(
        service.link(key, id, actionKey, 'client', '00000000'),
      ).rejects.toMatchObject({ response: { code: 'GUEST_LINK_INVALID' } });
    expect(challenge.attempts).toBe(5);
    expect(challenge.consumedAt).toBeInstanceOf(Date);
    expect(tx.commande.updateMany).not.toHaveBeenCalled();
  });
});
