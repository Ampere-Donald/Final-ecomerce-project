import { randomBytes } from 'crypto';
import {
  GuestActionService,
  eligibleGuestAction,
} from './guest-action.service';
import { GuestActionController } from './guest-action.controller';

describe('Email-proven guest order actions', () => {
  it('allows cancellation only before dispatch and receipt only for a dispatched delivery', () => {
    for (const statut of [
      'EN_ATTENTE',
      'CONFIRMEE',
      'EN_LIVRAISON',
      'ANNULEE',
      'LIVREE',
    ]) {
      for (const modeReception of ['LIVRAISON', 'RETRAIT_MAGASIN']) {
        const order = { statut, modeReception };
        expect(eligibleGuestAction(order, 'CANCEL')).toBe(
          ['EN_ATTENTE', 'CONFIRMEE'].includes(statut),
        );
        expect(eligibleGuestAction(order, 'RECEIVE')).toBe(
          statut === 'EN_LIVRAISON' && modeReception === 'LIVRAISON',
        );
      }
    }
  });
  it('announces channel unavailability without querying or sending', async () => {
    const db = { $transaction: jest.fn() },
      mail = {
        guestRecoveryAvailable: () => false,
        sendGuestActionCode: jest.fn(),
      };
    const service = new GuestActionService(db as any, mail as any);
    await expect(
      service.request(randomBytes(32).toString('base64url'), 'CANCEL'),
    ).resolves.toMatchObject({ available: false });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mail.sendGuestActionCode).not.toHaveBeenCalled();
  });
  it('rejects arbitrary action purposes even when sending is disabled', async () => {
    const db = { $transaction: jest.fn() };
    await expect(
      new GuestActionService(db as any, {} as any).request(
        'key',
        'LINK' as any,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('keeps action responses private and throttles both endpoints', () => {
    for (const name of ['request', 'execute']) {
      const handler = Object.getOwnPropertyDescriptor(
        GuestActionController.prototype,
        name,
      )!.value;
      expect(Reflect.getMetadata('__headers__', handler)).toEqual(
        expect.arrayContaining([
          { name: 'Cache-Control', value: 'private, no-store' },
          { name: 'Referrer-Policy', value: 'no-referrer' },
          { name: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ]),
      );
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(5);
    }
  });
});
