import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import { ProduitService } from '../produit/produit.service';
import { CategorieService } from '../categorie/categorie.service';
import { masquerCouts } from '../produit/public-product';
import { loadCatalogueRuntime } from './catalogue-runtime';
import type { CatalogueRuntime } from './catalogue-runtime';

@Injectable()
export class StorefrontRenderingService {
  private readonly runtime: CatalogueRuntime | null;
  constructor(private readonly produits: ProduitService, private readonly categories: CategorieService,
    config: ConfigService) {
    this.runtime = config.get<string>('STOREFRONT_CATALOGUE_RENDERING') === 'true'
      ? loadCatalogueRuntime(resolve(process.cwd(), '.storefront-renderer')) : null;
  }

  async catalogue(url: unknown, renderer: unknown) {
    if (typeof url !== 'string' || typeof renderer !== 'string' || !/^[a-f0-9]{64}$/.test(renderer))
      throw new BadRequestException('Requête de catalogue invalide.');
    if (!this.runtime) throw new ServiceUnavailableException('Affichage initial non activé.');
    if (renderer !== this.runtime.rendererId) throw new ConflictException('Versions du catalogue différentes.');
    let path: string;
    try { path = this.runtime.parseCatalogueRequest(url).path; }
    catch { throw new BadRequestException('Adresse de catalogue invalide.'); }
    const params = new URLSearchParams(path.split('?')[1]);
    const now = new Date();
    const [products, categories] = await Promise.all([
      this.produits.findAll({ publicPricingAt: now, page: Number(params.get('page')), limit: 24,
        search: params.get('search') || undefined, categoryId: params.get('categoryId') || undefined,
        inStock: params.get('inStock') === 'true', sort: params.get('sort') || undefined,
        minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : undefined,
        maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined,
        includeInactive: false, salesSearch: false }),
      this.categories.findAll(),
    ]);
    // Prisma Decimal/Date values must have exactly the same representation as
    // the existing JSON API before the renderer applies its public allowlist.
    const publicProducts = { ...products, data: products.data.map(product => masquerCouts(product, now)) };
    const wire = JSON.stringify({ products: publicProducts, categories });
    if (Buffer.byteLength(wire) > 640 * 1024) throw new ServiceUnavailableException('Catalogue trop volumineux.');
    const data = JSON.parse(wire);
    const html = this.runtime.renderCatalogueResponse(url, data.products, data.categories, now.getTime());
    if (Buffer.byteLength(html) > 512 * 1024) throw new ServiceUnavailableException('Catalogue trop volumineux.');
    return { html, rendererId: this.runtime.rendererId };
  }
}
