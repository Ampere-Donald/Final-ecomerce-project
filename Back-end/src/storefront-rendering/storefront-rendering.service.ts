import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import { ProduitService } from '../produit/produit.service';
import { CategorieService } from '../categorie/categorie.service';
import { masquerCouts } from '../produit/public-product';
import { loadCatalogueRuntime } from './catalogue-runtime';
import type { CatalogueRuntime } from './catalogue-runtime';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StorefrontRenderingService {
  private readonly runtime: CatalogueRuntime | null;
  constructor(private readonly produits: ProduitService, private readonly categories: CategorieService,
    config: ConfigService, @Optional() private readonly database?: DatabaseService) {
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
        sousCategorieId: params.get('sousCategorieId') || undefined,
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

  async product(url: unknown, renderer: unknown) {
    if (typeof url !== 'string' || typeof renderer !== 'string' || !/^[a-f0-9]{64}$/.test(renderer))
      throw new BadRequestException('Requête de produit invalide.');
    if (!this.runtime?.parseProductRequest || !this.runtime.renderProductResponse)
      throw new ServiceUnavailableException('Affichage produit non activé.');
    if (renderer !== this.runtime.rendererId) throw new ConflictException('Versions de la fiche différentes.');
    let id: string;
    try { id = this.runtime.parseProductRequest(url).id; }
    catch { throw new BadRequestException('Adresse de produit invalide.'); }
    const product = await this.produits.findOne(id);
    if (product.estActif !== true) throw new NotFoundException('Produit introuvable.');
    const now = new Date();
    const wire = JSON.stringify(masquerCouts(product, now, true));
    if (Buffer.byteLength(wire) > 384 * 1024) throw new ServiceUnavailableException('Fiche trop volumineuse.');
    const html = this.runtime.renderProductResponse(url, JSON.parse(wire), now.getTime());
    if (Buffer.byteLength(html) > 512 * 1024) throw new ServiceUnavailableException('Fiche trop volumineuse.');
    return { html, rendererId: this.runtime.rendererId };
  }

  async sitemap(renderer: unknown) {
    if (typeof renderer !== 'string' || !/^[a-f0-9]{64}$/.test(renderer)) throw new BadRequestException('Version de sitemap invalide.');
    if (!this.runtime?.renderSitemapResponse || !this.database) throw new ServiceUnavailableException('Sitemap non activé.');
    if (renderer !== this.runtime.rendererId) throw new ConflictException('Versions de sitemap différentes.');
    // A single bounded projection avoids prices, supplier data, reservations
    // and the large attribute joins required for a commercial product response.
    const rows = await this.database.produit.findMany({ where: { estActif: true },
      select: { id: true, nomProduit: true, categorieId: true, sousCategorieId: true },
      orderBy: { id: 'asc' }, take: 49001 });
    if (rows.length > 49000) throw new ServiceUnavailableException('Le sitemap doit être partitionné.');
    const xml = this.runtime.renderSitemapResponse(rows);
    return { xml, rendererId: this.runtime.rendererId };
  }
}
