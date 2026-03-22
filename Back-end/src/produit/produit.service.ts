import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Readable } from 'stream';
import AdmZip from 'adm-zip';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const csvParser = require('csv-parser');

@Injectable()
export class ProduitService {
  private readonly logger = new Logger(ProduitService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(createProduitDto: CreateProduitDto) {
    const { categorieId, ...rest } = createProduitDto;

    const data: any = { ...rest };

    if (data.finPromo) {
      data.finPromo = new Date(data.finPromo);
    }

    const produit = await this.db.produit.create({
      data: {
        ...data,
        categorie: { connect: { id: categorieId } },
      },
      include: { categorie: true },
    });

    this.notifications
      .create('PRODUIT_CREE', `Produit "${produit.nomProduit}" ajouté au catalogue`)
      .catch(() => {});

    return produit;
  }

  async getMetadata() {
    const agg = await this.db.produit.aggregate({
      _min: { prixDetail: true },
      _max: { prixDetail: true },
    });
    return {
      minPrice: agg._min.prixDetail ?? 0,
      maxPrice: agg._max.prixDetail ?? 1000000,
    };
  }

  async findFlash() {
    return await this.db.produit.findMany({
      where: {
        prixPromo: { not: null },
        finPromo: { gt: new Date() },
      },
      include: { categorie: true },
      orderBy: { dateAjout: 'desc' },
    });
  }

  async findPopulaires() {
    return await this.db.produit.findMany({
      where: { isPopulaire: true },
      include: { categorie: true },
      orderBy: { dateAjout: 'desc' },
      take: 20,
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
  } = {}) {
    const { page = 1, limit = 1000, search, categoryId, minPrice, maxPrice, inStock, sort } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { nomProduit: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { marque: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categorieId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.prixDetail = {};
      if (minPrice !== undefined) where.prixDetail.gte = minPrice;
      if (maxPrice !== undefined) where.prixDetail.lte = maxPrice;
    }

    if (inStock) {
      where.quantiteStock = { gt: 0 };
    }

    let orderBy: any = { dateAjout: 'desc' };
    if (sort) {
      switch (sort) {
        case 'price_asc':
          orderBy = { prixDetail: 'asc' };
          break;
        case 'price_desc':
          orderBy = { prixDetail: 'desc' };
          break;
        case 'name_asc':
          orderBy = { nomProduit: 'asc' };
          break;
        case 'name_desc':
          orderBy = { nomProduit: 'desc' };
          break;
      }
    }

    const [data, total] = await Promise.all([
      this.db.produit.findMany({
        where,
        skip,
        take: limit,
        include: {
          categorie: true,
          attributs: true,
        },
        orderBy,
      }),
      this.db.produit.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const produit = await this.db.produit.findUnique({
      where: { id },
      include: {
        categorie: true,
        attributs: { include: { valeurs: true } },
      },
    });
    if (!produit) {
      throw new NotFoundException(`Produit avec l'id ${id} non trouvé`);
    }
    return produit;
  }

  async update(id: string, updateProduitDto: UpdateProduitDto) {
    await this.findOne(id);

    const { categorieId, ...rest } = updateProduitDto;

    const updateData: any = {
      ...rest,
      version: { increment: 1 },
    };

    if (updateData.finPromo) {
      updateData.finPromo = new Date(updateData.finPromo);
    }

    if (categorieId) {
      updateData.categorie = { connect: { id: categorieId } };
    }

    try {
      const produit = await this.db.produit.update({
        where: { id },
        data: updateData,
        include: { categorie: true },
      });

      this.notifications
        .create('PRODUIT_MAJ', `Produit "${produit.nomProduit}" mis à jour`)
        .catch(() => {});

      return produit;
    } catch (e: any) {
      console.error('CRITICAL PRISMA ERROR:', e);
      throw new BadRequestException('Prisma a planté: ' + e.message);
    }
  }

  async uploadImage(id: string, imageUrl: string) {
    await this.findOne(id);
    return await this.db.produit.update({
      where: { id },
      data: { imageUrl, version: { increment: 1 } },
    });
  }

  async remove(id: string) {
    const produit = await this.findOne(id);
    const result = await this.db.produit.delete({
      where: { id },
    });
    
    // Clean up images from Cloudinary
    if (produit.imageUrl) this.cloudinary.deleteByUrl(produit.imageUrl).catch(() => {});
    if (produit.imageUrl2) this.cloudinary.deleteByUrl(produit.imageUrl2).catch(() => {});
    if (produit.imageUrl3) this.cloudinary.deleteByUrl(produit.imageUrl3).catch(() => {});
    
    return result;
  }

  // ── Parse CSV buffer into rows ────────────────────────────────────────────
  private parseCsv(buffer: Buffer): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const results: Record<string, string>[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser({ separator: ';' }))
        .on('data', (row: Record<string, string>) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', (err: Error) => reject(err));
    });
  }

  // ── Flexible column getter ────────────────────────────────────────────────
  private getCol(row: Record<string, string>, ...keys: string[]): string {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return row[k];
    }
    return '';
  }

  // ── Resolve or create category ────────────────────────────────────────────
  private async resolveCategory(
    name: string,
    categoryMap: Map<string, string>,
    newCategoriesCreated: string[],
  ): Promise<string> {
    const catKey = name.toLowerCase().trim() || 'divers';
    let categorieId = categoryMap.get(catKey);

    if (!categorieId) {
      const newCat = await this.db.categorie.create({ data: { nom: name || 'Divers' } });
      categoryMap.set(catKey, newCat.id);
      categorieId = newCat.id;
      newCategoriesCreated.push(name);
    }

    return categorieId;
  }

  // ── Build category map ────────────────────────────────────────────────────
  private async buildCategoryMap(): Promise<Map<string, string>> {
    const existingCategories = await this.db.categorie.findMany();
    const categoryMap = new Map<string, string>();
    for (const cat of existingCategories) {
      categoryMap.set(cat.nom.toLowerCase().trim(), cat.id);
    }

    // Ensure fallback "Divers" category
    if (!categoryMap.has('divers')) {
      const divers = await this.db.categorie.create({ data: { nom: 'Divers' } });
      categoryMap.set('divers', divers.id);
    }

    return categoryMap;
  }

  // ── Import plain CSV (backward compatible) ────────────────────────────────
  async importCsv(buffer: Buffer) {
    const rows = await this.parseCsv(buffer);

    if (rows.length === 0) {
      throw new BadRequestException('Le fichier CSV est vide ou illisible.');
    }

    const categoryMap = await this.buildCategoryMap();
    const newCategoriesCreated: string[] = [];
    const productsData: any[] = [];

    for (const row of rows) {
      const nomProduit = this.getCol(row, 'nomProduit', 'nom_produit', 'NomProduit', 'Nom', 'nom');
      const marque = this.getCol(row, 'marque', 'Marque');
      const description = this.getCol(row, 'description', 'Description');
      const prixDetail = parseFloat(this.getCol(row, 'prixDetail', 'prix_detail', 'PrixDetail', 'Prix', 'prix') || '0');
      const prixGros = parseFloat(this.getCol(row, 'prixGros', 'prix_gros', 'PrixGros') || '0');
      const quantiteStock = parseInt(this.getCol(row, 'quantiteStock', 'quantite_stock', 'QuantiteStock', 'Stock', 'stock') || '0', 10);
      const nomImage = this.getCol(row, 'nomImage', 'nom_image', 'NomImage', 'Image', 'image');
      const urlDatasheet = this.getCol(row, 'lienFicheTechnique', 'urlDatasheet', 'url_datasheet', 'UrlDatasheet', 'datasheet').trim();
      const prixPromoStr = this.getCol(row, 'prixPromotionnel', 'prixPromo', 'prix_promo', 'PrixPromo');
      const dateFinPromoStr = this.getCol(row, 'dateFinPromo', 'finPromo', 'fin_promo', 'FinPromo');
      const mettreEnAvantStr = this.getCol(row, 'mettreEnAvant', 'isPopulaire', 'is_populaire', 'IsPopulaire', 'populaire');
      const categorieNom = this.getCol(row, 'categorieNom', 'categorie_nom', 'CategorieNom', 'Categorie', 'categorie', 'Catégorie', 'catégorie');

      if (!nomProduit.trim()) continue;

      const categorieId = await this.resolveCategory(categorieNom, categoryMap, newCategoriesCreated);

      const productEntry: any = {
        nomProduit: nomProduit.trim(),
        marque: marque.trim() || null,
        description: description.trim() || null,
        prixDetail: isNaN(prixDetail) ? 0 : prixDetail,
        prixGros: isNaN(prixGros) ? 0 : prixGros,
        quantiteStock: isNaN(quantiteStock) ? 0 : quantiteStock,
        imageUrl: nomImage.trim() || null,
        categorieId,
      };

      if (urlDatasheet) productEntry.urlDatasheet = urlDatasheet;
      const prixPromo = parseFloat(prixPromoStr);
      if (!isNaN(prixPromo) && prixPromo > 0) productEntry.prixPromo = prixPromo;
      if (dateFinPromoStr) {
        const d = new Date(dateFinPromoStr);
        if (!isNaN(d.getTime())) productEntry.finPromo = d;
      }
      if (mettreEnAvantStr) {
        productEntry.isPopulaire = mettreEnAvantStr.toLowerCase() === 'true' || mettreEnAvantStr === '1';
      }

      productsData.push(productEntry);
    }

    if (productsData.length === 0) {
      throw new BadRequestException('Le fichier ne contient aucun produit valide.');
    }

    const result = await this.db.produit.createMany({
      data: productsData,
      skipDuplicates: true,
    });

    return {
      message: `Import terminé avec succès`,
      totalLignesCsv: rows.length,
      produitsImportes: result.count,
      produitsIgnores: productsData.length - result.count,
      nouvellesCategories: newCategoriesCreated,
    };
  }

  // ── Import ZIP (CSV + images) with create-or-update logic ─────────────────
  async importZip(buffer: Buffer) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // 1. Find the CSV file inside the ZIP
    const csvEntry = entries.find(
      (e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.csv') && !e.entryName.startsWith('__MACOSX'),
    );
    if (!csvEntry) {
      throw new BadRequestException('Aucun fichier CSV trouvé dans le ZIP.');
    }

    // 2. Build a map of image files: lowercase filename → buffer
    const imageMap = new Map<string, Buffer>();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    for (const entry of entries) {
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX')) continue;
      const name = entry.entryName.split('/').pop()!.toLowerCase();
      if (imageExtensions.some((ext) => name.endsWith(ext))) {
        imageMap.set(name, entry.getData());
      }
    }

    // 3. Parse the CSV
    const csvBuffer = csvEntry.getData();
    const rows = await this.parseCsv(csvBuffer);

    if (rows.length === 0) {
      throw new BadRequestException('Le fichier CSV dans le ZIP est vide ou illisible.');
    }

    const categoryMap = await this.buildCategoryMap();
    const newCategoriesCreated: string[] = [];

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let imagesUploaded = 0;

    // 4. Process each row: create or update
    for (const row of rows) {
      const nomProduit = this.getCol(row, 'nomProduit', 'nom_produit', 'NomProduit', 'Nom', 'nom').trim();
      const marque = this.getCol(row, 'marque', 'Marque').trim();

      if (!nomProduit) {
        skipped++;
        continue;
      }

      // Extract fields
      const description = this.getCol(row, 'description', 'Description').trim() || null;
      const prixDetailStr = this.getCol(row, 'prixDetail', 'prix_detail', 'PrixDetail', 'Prix', 'prix');
      const prixGrosStr = this.getCol(row, 'prixGros', 'prix_gros', 'PrixGros');
      const quantiteStockStr = this.getCol(row, 'quantiteStock', 'quantite_stock', 'QuantiteStock', 'Stock', 'stock');
      const urlDatasheet = this.getCol(row, 'lienFicheTechnique', 'urlDatasheet', 'url_datasheet', 'UrlDatasheet', 'datasheet').trim() || null;
      const prixPromoStr = this.getCol(row, 'prixPromotionnel', 'prixPromo', 'prix_promo', 'PrixPromo');
      const dateFinPromoStr = this.getCol(row, 'dateFinPromo', 'finPromo', 'fin_promo', 'FinPromo');
      const mettreEnAvantStr = this.getCol(row, 'mettreEnAvant', 'isPopulaire', 'is_populaire', 'IsPopulaire', 'populaire');
      const categorieNom = this.getCol(row, 'categorieNom', 'categorie_nom', 'CategorieNom', 'Categorie', 'categorie', 'Catégorie', 'catégorie');

      // Image columns: image1, image2, image3 (new) OR legacy nomImage
      const image1 = this.getCol(row, 'image1', 'Image1', 'nomImage', 'nom_image', 'NomImage', 'Image', 'image').trim();
      const image2 = this.getCol(row, 'image2', 'Image2').trim();
      const image3 = this.getCol(row, 'image3', 'Image3').trim();

      const categorieId = await this.resolveCategory(categorieNom, categoryMap, newCategoriesCreated);

      // Check if product already exists (by marque + nomProduit unique constraint)
      const existing = await this.db.produit.findFirst({
        where: {
          nomProduit,
          marque: marque || undefined,
        },
      });

      // Process images for this row
      const imageUrls = await this.resolveImportImages(
        [image1, image2, image3],
        imageMap,
        existing ? [existing.imageUrl, existing.imageUrl2, existing.imageUrl3] : [null, null, null],
      );
      imagesUploaded += imageUrls.filter((u) => u !== null && u !== undefined).length;

      // Build data object (only include non-empty fields for updates)
      const productData: any = {
        nomProduit,
        marque: marque || null,
        categorieId,
        imageUrl: imageUrls[0],
        imageUrl2: imageUrls[1],
        imageUrl3: imageUrls[2],
      };

      // Only set these fields if they are present in the CSV (non-empty)
      if (description) productData.description = description;
      if (prixDetailStr) {
        const v = parseFloat(prixDetailStr);
        if (!isNaN(v)) productData.prixDetail = v;
      }
      if (prixGrosStr) {
        const v = parseFloat(prixGrosStr);
        if (!isNaN(v)) productData.prixGros = v;
      }
      if (quantiteStockStr) {
        const v = parseInt(quantiteStockStr, 10);
        if (!isNaN(v)) productData.quantiteStock = v;
      }
      if (urlDatasheet) productData.urlDatasheet = urlDatasheet;
      if (prixPromoStr) {
        const v = parseFloat(prixPromoStr);
        if (!isNaN(v) && v > 0) productData.prixPromo = v;
      }
      if (dateFinPromoStr) {
        const d = new Date(dateFinPromoStr);
        if (!isNaN(d.getTime())) productData.finPromo = d;
      }
      if (mettreEnAvantStr) {
        productData.isPopulaire = mettreEnAvantStr.toLowerCase() === 'true' || mettreEnAvantStr === '1';
      }

      if (existing) {
        // UPDATE existing product
        await this.db.produit.update({
          where: { id: existing.id },
          data: { ...productData, version: { increment: 1 } },
        });
        updated++;
      } else {
        // CREATE new product
        await this.db.produit.create({
          data: {
            ...productData,
            prixDetail: productData.prixDetail ?? 0,
            prixGros: productData.prixGros ?? 0,
            quantiteStock: productData.quantiteStock ?? 0,
          },
        });
        created++;
      }
    }

    return {
      message: 'Import ZIP terminé avec succès',
      totalLignesCsv: rows.length,
      produitsCreés: created,
      produitsMisAJour: updated,
      produitsIgnorés: skipped,
      imagesUploadées: imagesUploaded,
      nouvellesCategories: newCategoriesCreated,
    };
  }

  /**
   * Resolve image values from CSV for import:
   *  - empty string → keep existing image (no change)
   *  - "SUPPRIMER" → remove the image (set null)
   *  - URL (http...) → keep as-is (already a Cloudinary/external URL)
   *  - filename → look up in imageMap, upload to Cloudinary
   */
  private async resolveImportImages(
    csvValues: string[],
    imageMap: Map<string, Buffer>,
    existingUrls: (string | null | undefined)[],
  ): Promise<(string | null)[]> {
    const result: (string | null)[] = [];

    for (let i = 0; i < 3; i++) {
      const val = (csvValues[i] || '').trim();
      const existing = existingUrls[i] || null;

      if (!val) {
        // Empty → keep existing
        result.push(existing);
      } else if (val.toUpperCase() === 'SUPPRIMER') {
        // Explicit removal
        if (existing) this.cloudinary.deleteByUrl(existing).catch(() => {});
        result.push(null);
      } else if (val.startsWith('http://') || val.startsWith('https://')) {
        // Already a full URL
        if (existing && existing !== val) this.cloudinary.deleteByUrl(existing).catch(() => {});
        result.push(val);
      } else {
        // Filename → upload from ZIP
        const imageBuffer = imageMap.get(val.toLowerCase());
        if (imageBuffer) {
          try {
            const url = await this.cloudinary.uploadBuffer(imageBuffer, {
              folder: 'produits',
            });
            if (existing) this.cloudinary.deleteByUrl(existing).catch(() => {});
            result.push(url);
          } catch (err) {
            this.logger.warn(`Failed to upload image "${val}": ${err}`);
            result.push(existing); // Keep existing on failure
          }
        } else {
          this.logger.warn(`Image "${val}" not found in ZIP archive`);
          result.push(existing); // Keep existing if file not in ZIP
        }
      }
    }

    return result;
  }

  // ── Cleanup invalid images (now checks for non-Cloudinary URLs) ───────────
  async cleanupInvalidImages() {
    const produits = await this.db.produit.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, nomProduit: true, imageUrl: true },
    });

    const invalids: string[] = [];
    let valid = 0;

    for (const prod of produits) {
      const url = prod.imageUrl!;
      // Cloudinary URLs and other http(s) URLs are considered valid
      if (url.startsWith('http://') || url.startsWith('https://')) {
        valid++;
      } else {
        // Legacy /uploads/ paths are now invalid (ephemeral disk)
        invalids.push(prod.id);
      }
    }

    if (invalids.length === 0) {
      return { message: 'Aucune imageUrl invalide trouvée.', cleaned: 0, valid };
    }

    const result = await this.db.produit.updateMany({
      where: { id: { in: invalids } },
      data: { imageUrl: null },
    });

    return {
      message: `Nettoyage terminé avec succès.`,
      cleaned: result.count,
      valid,
      total: produits.length,
    };
  }
}
