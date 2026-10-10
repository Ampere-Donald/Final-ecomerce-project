import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { StorefrontRenderingService } from './storefront-rendering.service';
import { loadCatalogueRuntime } from './catalogue-runtime';
jest.mock('./catalogue-runtime', () => ({ loadCatalogueRuntime: jest.fn() }));

describe('anonymous catalogue rendering', () => {
  const id = 'a'.repeat(64);
  const parse = jest.fn(() => ({ url: '/catalogue', path: '/produits?page=2&limit=24&sort=price_desc&search=c%C3%A2ble&categoryId=cat&inStock=true&minPrice=50&maxPrice=500' }));
  const render = jest.fn(() => '<div>public catalogue</div>');
  const products = { findAll: jest.fn() }, categories = { findAll: jest.fn() };
  const instance = (enabled = true) => new StorefrontRenderingService(products as any, categories as any,
    { get: () => enabled ? 'true' : undefined } as any);
  beforeEach(() => {
    jest.clearAllMocks(); parse.mockImplementation(() => ({ url: '/catalogue', path: '/produits?page=2&limit=24&sort=price_desc&search=c%C3%A2ble&categoryId=cat&inStock=true&minPrice=50&maxPrice=500' }));
    render.mockReturnValue('<div>public catalogue</div>');
    (loadCatalogueRuntime as jest.Mock).mockReturnValue({ rendererId: id, parseCatalogueRequest: parse, renderCatalogueResponse: render });
    products.findAll.mockResolvedValue({ data: [{ id: 'p1', nomProduit: 'Cable', quantiteStock: 10,
      quantiteReservee: 4, quantiteDisponibleVente: 6, prixDetail: 100, prixPromo: 80,
      finPromo: new Date(Date.now() + 60000), cmupActuel: 40, dernierFournisseurId: 'private' }], meta: { total: 1, lastPage: 1 } });
    categories.findAll.mockResolvedValue([{ id: 'cat', nom: 'Câbles' }]);
  });
  it('disabled or mismatched runtime never reads the database', async () => {
    await expect(instance(false).catalogue('/catalogue', id)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(instance().catalogue('/catalogue', 'b'.repeat(64))).rejects.toBeInstanceOf(ConflictException);
    expect(products.findAll).not.toHaveBeenCalled(); expect(categories.findAll).not.toHaveBeenCalled();
  });
  it('rejects malformed query arguments before any database read', async () => {
    await expect(instance().catalogue(['/catalogue'], id)).rejects.toBeInstanceOf(BadRequestException);
    parse.mockImplementation(() => { throw Error('URL'); });
    await expect(instance().catalogue('https://other.example', id)).rejects.toBeInstanceOf(BadRequestException);
    expect(products.findAll).not.toHaveBeenCalled();
  });
  it('uses public filtering and the same price/available-stock projection as the JSON API', async () => {
    const result = await instance().catalogue('/catalogue', id);
    expect(result.rendererId).toBe(id);
    expect(products.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 24, sort: 'price_desc',
      search: 'câble', categoryId: 'cat', inStock: true, minPrice: 50, maxPrice: 500,
      includeInactive: false, salesSearch: false, publicPricingAt: expect.any(Date) }));
    const [, data, , at] = render.mock.calls[0] as any;
    const p = data.data[0];
    expect(p.prixPublic).toBe(80); expect(p.quantiteStock).toBe(6);
    expect(p).not.toHaveProperty('cmupActuel'); expect(p).not.toHaveProperty('dernierFournisseurId');
    expect(p).not.toHaveProperty('quantiteReservee');
    expect(at).toBe(products.findAll.mock.calls[0][0].publicPricingAt.getTime());
  });
  it('normalizes Decimal/Date like the JSON API and does not fabricate an empty result on outage', async () => {
    products.findAll.mockResolvedValue({ data: [{ id: 'p1', prixDetail: { toJSON: () => '125.50' },
      quantiteStock: 1 }], meta: { total: 1, lastPage: 1 } });
    await instance().catalogue('/catalogue', id);
    expect((render.mock.calls[0] as any)[1].data[0].prixDetail).toBe('125.50');
    products.findAll.mockRejectedValue(Error('Database unavailable'));
    await expect(instance().catalogue('/catalogue', id)).rejects.toThrow('Database unavailable');
  });
  it('rejects an unexpectedly large render instead of serving an unbounded fragment', async () => {
    render.mockReturnValue('x'.repeat(512 * 1024 + 1));
    await expect(instance().catalogue('/catalogue', id)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
