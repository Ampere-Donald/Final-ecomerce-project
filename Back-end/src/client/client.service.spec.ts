import { ClientService } from './client.service';

describe('ClientService credit preview', () => {
  const db: any = {
    client: { findUnique: jest.fn() },
    vente: { findMany: jest.fn() },
  };
  const service = new ClientService(db);

  beforeEach(() => jest.clearAllMocks());

  it('calcule le nouvel encours et bloque un dépassement de limite', async () => {
    db.client.findUnique.mockResolvedValue({ id: 'client-1', limiteCredit: 50000 });
    db.vente.findMany.mockResolvedValue([
      { montantTotal: 20000, montantPaye: 5000, dateVente: new Date('2026-07-01') },
    ]);

    await expect(service.previewCredit('client-1', 40000, 2000)).resolves.toEqual({
      clientId: 'client-1',
      encoursActuel: 15000,
      nouveauCredit: 38000,
      nouveauSoldeDu: 53000,
      limiteCredit: 50000,
      autorise: false,
      disponible: 35000,
    });
  });
});
