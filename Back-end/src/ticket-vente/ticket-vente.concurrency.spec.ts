import { ConflictException } from '@nestjs/common';
import { claimTicketForCheckout } from './ticket-vente.service';

describe('atomic ticket checkout claim', () => {
  it('n’autorise qu’un seul encaissement concurrent', async () => {
    let available = true;
    const tx: any = { ticketVente: { updateMany: jest.fn(async () => {
      if (!available) return { count: 0 };
      available = false;
      return { count: 1 };
    }) } };
    const data = { caissierId: 'cashier-1', clientId: null, methodePaiement: 'ESPECES' as const };
    const results = await Promise.allSettled([
      claimTicketForCheckout(tx, 'ticket-1', data),
      claimTicketForCheckout(tx, 'ticket-1', data),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
  });
});
