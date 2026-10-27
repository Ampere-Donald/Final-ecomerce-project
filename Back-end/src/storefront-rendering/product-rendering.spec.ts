import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { StorefrontRenderingService } from './storefront-rendering.service';
import { loadCatalogueRuntime } from './catalogue-runtime';
jest.mock('./catalogue-runtime', () => ({ loadCatalogueRuntime: jest.fn() }));

describe('anonymous product HTML', () => {
  const rendererId = 'a'.repeat(64), id = '13d2ff99-cd90-430d-b713-be98828f51cd';
  const parseProductRequest = jest.fn(), renderProductResponse = jest.fn();
  const produits = { findOne: jest.fn() };
  const service = (enabled = true) => new StorefrontRenderingService(produits as any, {} as any, { get: () => enabled ? 'true' : undefined } as any);
  beforeEach(() => {
    jest.clearAllMocks();
    parseProductRequest.mockReturnValue({ id }); renderProductResponse.mockReturnValue('<div>Public product</div>');
    (loadCatalogueRuntime as jest.Mock).mockReturnValue({ rendererId, parseProductRequest, renderProductResponse });
    produits.findOne.mockResolvedValue({ id, estActif: true, nomProduit: 'TDA', prixDetail: 1000,
      quantiteStock: 7, quantiteDisponibleVente: 5, quantiteReservee: 2, cmupActuel: 30, dernierFournisseurId: 'secret' });
  });
  it('disabled, mismatched or malformed requests cannot read a product', async () => {
    await expect(service(false).product('/product/' + id, rendererId)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service().product('/product/' + id, 'b'.repeat(64))).rejects.toBeInstanceOf(ConflictException);
    await expect(service().product([], rendererId)).rejects.toBeInstanceOf(BadRequestException);
    parseProductRequest.mockImplementation(() => { throw Error('invalid'); });
    await expect(service().product('https://other.example', rendererId)).rejects.toBeInstanceOf(BadRequestException);
    expect(produits.findOne).not.toHaveBeenCalled();
  });
  it('uses current public available stock and price, strips internal fields and preserves inactive 404', async () => {
    const result = await service().product('/product/' + id, rendererId);
    expect(result.rendererId).toBe(rendererId);
    expect(produits.findOne).toHaveBeenCalledWith(id);
    const [, product, at] = renderProductResponse.mock.calls[0];
    expect(product.quantiteStock).toBe(5); expect(product.prixPublic).toBe(1000);
    for (const field of ['cmupActuel', 'dernierFournisseurId', 'quantiteReservee']) expect(product).not.toHaveProperty(field);
    expect(Number.isSafeInteger(at)).toBe(true);
    produits.findOne.mockResolvedValue({ id, estActif: false });
    await expect(service().product('/product/' + id, rendererId)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('upstream failures and oversized payloads never become a successful empty page', async () => {
    produits.findOne.mockRejectedValue(Error('Database unavailable'));
    await expect(service().product('/product/' + id, rendererId)).rejects.toThrow('Database unavailable');
    produits.findOne.mockResolvedValue({ id, estActif: true, description: 'x'.repeat(384 * 1024 + 1) });
    await expect(service().product('/product/' + id, rendererId)).rejects.toBeInstanceOf(ServiceUnavailableException);
    produits.findOne.mockResolvedValue({ id, estActif: true }); renderProductResponse.mockReturnValue('x'.repeat(512 * 1024 + 1));
    await expect(service().product('/product/' + id, rendererId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
