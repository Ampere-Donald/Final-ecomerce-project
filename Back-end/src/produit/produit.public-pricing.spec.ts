import { ProduitController } from './produit.controller';
import { ProduitService } from './produit.service';
const raw = {
  id: 'p',
  nomProduit: 'Fictif',
  estActif: true,
  prixDetail: 3500,
  prixPromo: 3000,
  finPromo: '2099-01-01T00:00:00Z',
  quantiteStock: 10,
  quantiteDisponibleVente: 2,
  quantiteReservee: 8,
  cmupActuel: 'SECRET',
  dernierCoutAchatFcfa: 'SECRET',
  dernierFournisseurId: 'SECRET',
  derniereDeviseAchat: 'SECRET',
  dernierAchatAt: 'SECRET',
};
describe('Public merchandising boundaries', () => {
  const setup = () => {
    const service: any = {
      findAll: jest.fn().mockResolvedValue({ data: [raw], meta: { total: 1 } }),
      findOne: jest.fn().mockResolvedValue(raw),
      findFlash: jest.fn().mockResolvedValue([raw]),
      findPopulaires: jest.fn().mockResolvedValue([raw]),
      findArrivages: jest
        .fn()
        .mockResolvedValue([{ ...raw, arrivageAt: new Date() }]),
    };
    return { service, controller: new ProduitController(service, {} as any) };
  };
  it('hides costs and reservations in every public catalogue/offer/popular/detail response', async () => {
    const { controller } = setup();
    const list = await controller.findAll({}),
      detail = await controller.findOne({}, 'p');
    const rows = [
      ...list.data,
      detail,
      ...(await controller.findFlash()),
      ...(await controller.findPopulaires()),
      ...(await controller.findArrivages()),
    ];
    for (const row of rows) {
      expect(JSON.stringify(row)).not.toContain('SECRET');
      expect(row.quantiteReservee).toBeUndefined();
      expect(row.quantiteStock).toBe(2);
      expect(row.prixDetail).toBe(3500);
      expect(row.prixPublic).toBe(3000);
    }
    expect(raw.quantiteStock).toBe(10);
    expect(raw.quantiteReservee).toBe(8);
  });
  it('does not change the privileged physical-stock/price management view', async () => {
    const { controller } = setup();
    expect(
      await controller.findOne({ user: { role: 'SUPER_ADMIN' } }, 'p'),
    ).toBe(raw);
    const ordinaryAdmin = await controller.findOne(
      { user: { role: 'ADMIN' } },
      'p',
    );
    expect(ordinaryAdmin.cmupActuel).toBeUndefined();
    expect(ordinaryAdmin.quantiteStock).toBe(10);
  });
  it('omits invalid legacy offers, preserves optional PATCH fields and allows an explicit removal', async () => {
    const { service, controller } = setup();
    service.findFlash.mockResolvedValue([
      { ...raw, finPromo: '2000-01-01T00:00:00Z' },
    ]);
    expect(await controller.findFlash()).toEqual([]);
    service.update = jest
      .fn()
      .mockImplementation((_id, dto) => ({ ...raw, ...dto }));
    await controller.update(
      'p',
      { user: { id: 'admin', role: 'SUPER_ADMIN' } },
      { nomProduit: 'Autre' },
    );
    expect(service.update.mock.calls[0][1]).not.toHaveProperty('prixPromo');
    expect(service.update.mock.calls[0][1]).not.toHaveProperty('finPromo');
    await controller.update(
      'p',
      { user: { id: 'admin', role: 'SUPER_ADMIN' } },
      { prixPromo: '', finPromo: '' } as any,
    );
    expect(service.update.mock.calls[1][1]).toMatchObject({
      prixPromo: null,
      finPromo: null,
    });
  });
  it('prevents an ADMIN changing the promotion amount or validity via product editing', async () => {
    const db: any = { produit: { update: jest.fn().mockResolvedValue(raw) } };
    const service = new ProduitService(
      db,
      { create: jest.fn().mockResolvedValue({}) } as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue(raw as any);
    await service.update(
      'p',
      {
        prixPromo: 1,
        finPromo: '2099-01-01T00:00:00Z',
        quantiteStock: 100,
        nomProduit: 'Correction',
      },
      { id: 'a', role: 'ADMIN', nom: 'Fictif' },
    );
    const data = db.produit.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('prixPromo');
    expect(data).not.toHaveProperty('finPromo');
    expect(data).not.toHaveProperty('quantiteStock');
    expect(data.nomProduit).toBe('Correction');
    await expect(
      service.update(
        'p',
        { prixPromo: 4000 },
        { id: 's', role: 'SUPER_ADMIN', nom: 'Fictif' },
      ),
    ).rejects.toThrow();
    expect(db.produit.update).toHaveBeenCalledTimes(1);
  });
  it('refuses the edit if the product changes between commercial validation and writing', async () => {
    const db: any = {
      produit: { update: jest.fn().mockRejectedValue({ code: 'P2025' }) },
    };
    const service = new ProduitService(db, {} as any, {} as any, {} as any);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ ...raw, version: 4 } as any);
    await expect(
      service.update(
        'p',
        { prixPromo: 2500 },
        { id: 's', role: 'SUPER_ADMIN', nom: 'Fictif' },
      ),
    ).rejects.toThrow('produit a changé');
    expect(db.produit.update.mock.calls[0][0].where).toEqual({
      id: 'p',
      version: 4,
    });
  });
  it('dates arrivals from validated purchases, deduplicates receipts and omits fully reserved stock', async () => {
    const date = new Date(),
      older = new Date(date.getTime() - 86400000);
    const db: any = {
      ligneAchat: {
        findMany: jest.fn().mockResolvedValue([
          { achat: { validatedAt: date }, produit: raw },
          { achat: { validatedAt: older }, produit: raw },
        ]),
      },
      produit: { findMany: jest.fn().mockResolvedValue([raw]) },
      ligneTicket: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ produitId: 'p', _sum: { quantite: 10 } }]),
      },
    };
    const service = new ProduitService(db, {} as any, {} as any, {} as any);
    expect(await service.findArrivages()).toEqual([]);
    db.ligneTicket.groupBy.mockResolvedValue([]);
    const rows = await service.findArrivages();
    expect(rows).toHaveLength(1);
    expect(rows[0].arrivageAt).toBe(date);
    expect(db.ligneAchat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          quantite: { gt: 0 },
          achat: {
            statutAchat: 'VALIDE',
            validatedAt: { gte: expect.any(Date), lte: expect.any(Date) },
          },
        }),
        take: 100,
      }),
    );
  });
});
