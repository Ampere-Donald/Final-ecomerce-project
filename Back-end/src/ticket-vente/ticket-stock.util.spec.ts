import { ConflictException } from '@nestjs/common';
import {
  assertTicketStockAvailable,
  inspectTicketStock,
  lockTicketStock,
} from './ticket-stock.util';

describe('ticket stock reservations', () => {
  const queryRaw = jest.fn();
  const findMany = jest.fn();
  const groupBy = jest.fn();
  const client = {
    $queryRawUnsafe: queryRaw,
    produit: { findMany },
    ligneTicket: { groupBy },
  };

  beforeEach(() => {
    queryRaw.mockReset().mockResolvedValue([]);
    findMany.mockReset();
    groupBy.mockReset();
  });

  it('deducts quantities already promised to pending tickets', async () => {
    findMany.mockResolvedValue([
      { id: 'product-1', nomProduit: 'Fer à souder 40W', quantiteStock: 5 },
    ]);
    groupBy.mockResolvedValue([
      { produitId: 'product-1', _sum: { quantite: 3 } },
    ]);

    const [availability] = await inspectTicketStock(client as any, [
      { produitId: 'product-1', quantite: 3 },
    ]);

    expect(availability).toEqual(expect.objectContaining({
      stockPhysique: 5,
      quantiteReservee: 3,
      quantiteDisponible: 2,
      quantiteDemandee: 3,
      suffisant: false,
    }));
    expect(() => assertTicketStockAvailable([availability])).toThrow(ConflictException);
  });

  it('locks each product once and in a stable order', async () => {
    await lockTicketStock(client as any, ['product-b', 'product-a', 'product-b']);

    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(queryRaw.mock.calls.map((call) => call[1])).toEqual([
      'newoteg:ticket-stock:product-a',
      'newoteg:ticket-stock:product-b',
    ]);
  });
});
