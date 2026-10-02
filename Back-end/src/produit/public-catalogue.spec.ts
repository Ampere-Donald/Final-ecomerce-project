import { publicCatalogue } from './public-catalogue';
import { ProduitController } from './produit.controller';

describe('Public catalogue contract', () => {
  it('loads only the selected page, preserves SQL ordering and reads rows in the same snapshot', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          total: 8n,
          rows: [
            { id: 'second', available: 2 },
            { id: 'first', available: 0 },
          ],
        },
      ]),
      produit: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'first' }, { id: 'second' }]),
      },
    };
    const db = { $transaction: jest.fn((fn) => fn(tx)) };
    const result = await publicCatalogue(
      db,
      { limit: 2, page: 3, sort: 'price_asc', maxPrice: 3000 },
      new Date(),
    );
    expect(result.meta).toEqual({ total: 8, page: 3, limit: 2, lastPage: 4 });
    expect(result.data.map((p) => [p.id, p.quantiteDisponibleVente])).toEqual([
      ['second', 2],
      ['first', 0],
    ]);
    expect(tx.produit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['second', 'first'] } } }),
    );
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });
  it('returns the full count for a page beyond the results without loading products', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ total: 4n, rows: [] }]),
      produit: { findMany: jest.fn() },
    };
    const result = await publicCatalogue(
      { $transaction: (fn) => fn(tx) },
      { page: 8, limit: 2 },
      new Date(),
    );
    expect(result).toEqual({
      data: [],
      meta: { total: 4, page: 8, limit: 2, lastPage: 2 },
    });
    expect(tx.produit.findMany).not.toHaveBeenCalled();
  });
  it.each([
    { minPrice: NaN },
    { maxPrice: Infinity },
    { minPrice: -1 },
    { minPrice: 4000, maxPrice: 3000 },
  ])(
    'rejects invalid price ranges before any database read: %p',
    async (params) => {
      const db = { $transaction: jest.fn() };
      await expect(publicCatalogue(db, params, new Date())).rejects.toThrow();
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it('selects public pricing only for the public view and freezes one instant per response', async () => {
    const service: any = { findAll: jest.fn().mockResolvedValue({ data: [] }) };
    const controller = new ProduitController(service, {} as any);
    await controller.findAll({});
    expect(service.findAll.mock.calls[0][0].publicPricingAt).toBeInstanceOf(
      Date,
    );
    await controller.findAll({ user: { role: 'SUPER_ADMIN' } });
    expect(service.findAll.mock.calls[1][0].publicPricingAt).toBeUndefined();
  });
});
