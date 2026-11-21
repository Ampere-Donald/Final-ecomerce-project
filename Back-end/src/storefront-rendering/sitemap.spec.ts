import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { StorefrontRenderingService } from './storefront-rendering.service';
import { loadCatalogueRuntime } from './catalogue-runtime';
jest.mock('./catalogue-runtime', () => ({ loadCatalogueRuntime: jest.fn() }));

describe('sitemap public projection', () => {
  const rendererId = 'a'.repeat(64);
  const database = { produit: { findMany: jest.fn() } };
  const renderSitemapResponse = jest.fn();
  const service = () => new StorefrontRenderingService({} as any, {} as any, { get: () => 'true' } as any, database as any);
  beforeEach(() => {
    jest.clearAllMocks();
    (loadCatalogueRuntime as jest.Mock).mockReturnValue({ rendererId, renderSitemapResponse });
    renderSitemapResponse.mockReturnValue('<urlset/>'); database.produit.findMany.mockResolvedValue([{ id: 'public' }]);
  });
  it('reads active identities only, without prices, stock or arbitrary relations', async () => {
    const result = await service().sitemap(rendererId);
    expect(result.xml).toBe('<urlset/>'); expect(result.rendererId).toBe(rendererId);
    expect(database.produit.findMany).toHaveBeenCalledWith({ where: { estActif: true },
      select: { id: true, nomProduit: true, categorieId: true, sousCategorieId: true,
        description: true, imageUrl: true, marque: true, urlDatasheet: true,
        attributs: { select: { id: true }, take: 1 } }, orderBy: { id: 'asc' }, take: 49001 });
    expect(renderSitemapResponse).toHaveBeenCalledWith([{ id: 'public' }]);
  });
  it('invalid or incompatible versions never read the database', async () => {
    await expect(service().sitemap([])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service().sitemap('b'.repeat(64))).rejects.toBeInstanceOf(ConflictException);
    expect(database.produit.findMany).not.toHaveBeenCalled();
  });
  it('oversized catalogues and unavailable databases cannot publish a partial success', async () => {
    database.produit.findMany.mockResolvedValue(Array(49001).fill({ id: 'public' }));
    await expect(service().sitemap(rendererId)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(renderSitemapResponse).not.toHaveBeenCalled();
    database.produit.findMany.mockRejectedValue(Error('offline'));
    await expect(service().sitemap(rendererId)).rejects.toThrow('offline');
  });
});
