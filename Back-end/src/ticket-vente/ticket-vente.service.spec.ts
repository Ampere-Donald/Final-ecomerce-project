import { TicketVenteService } from './ticket-vente.service';

describe('TicketVenteService seller attribution', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const db = {
    ticketVente: {
      findMany,
      findUnique,
    },
  };
  const service = new TicketVenteService(
    db as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findUnique.mockReset();
  });

  it('includes the seller name in the cashier queue', async () => {
    await service.listEnAttente();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          vendeur: {
            select: {
              id: true,
              nom: true,
              username: true,
            },
          },
        }),
      }),
    );
  });

  it('includes the seller name in ticket details', async () => {
    findUnique.mockResolvedValue({ id: 'ticket-1' });

    await service.findOne('ticket-1');

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          vendeur: {
            select: {
              id: true,
              nom: true,
              username: true,
            },
          },
        }),
      }),
    );
  });
});
