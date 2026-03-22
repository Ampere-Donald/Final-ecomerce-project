import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Readable } from 'stream';
import AdmZip from 'adm-zip';
import { createReadStream, existsSync, promises as fsPromises } from 'fs';
import { join, basename } from 'path';
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

  private importStatus = {
    isImporting: false,
    progress: 0,
    message: '',
    error: null as string | null
  };

  getImportStatus() {
    return this.importStatus;
  }

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
      const firstLine = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)).split('\n')[0] || '';
      const separator = firstLine.includes(';') ? ';' : ',';
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser({
          separator,
          mapHeaders: ({ header }: { header: string }) => header.trim().replace(/^\uFEFF/g, '')
        }))
        .on('data', (row: Record<string, string>) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', (err: Error) => reject(err));
    });
  }

  // ── Flexible column getter ────────────────────────────────────────────────
  // Handles PapaParse-renamed duplicate columns (e.g., PrixPromo_1, marque_2)
  // and always returns '' instead of undefined to prevent Prisma crashes.
  private getCol(row: Record<string, string>, ...keys: string[]): string {
    for (const k of keys) {
      // Exact match first
      if (row[k] !== undefined && row[k] !== '') return row[k];
    }
    // Fallback: check for PapaParse-suffixed variants (_1, _2, ... _9)
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const kLower = k.toLowerCase();
      for (const rk of rowKeys) {
        if (rk === k) continue; // already checked
        // Match "key_1", "key_2", etc. (case-insensitive)
        if (rk.toLowerCase().replace(/_\d+$/, '') === kLower) {
          if (row[rk] !== undefined && row[rk] !== '') return row[rk];
        }
      }
    }
    return '';
  }

  // ── Helper to normalize accents ───────────────────────────────────────────
  private normalizeString(s: string): string {
    return (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  // ── Resolve or create category ────────────────────────────────────────────
  private async resolveCategory(
    name: string,
    categoryMap: Map<string, string>,
    newCategoriesCreated: string[],
  ): Promise<string> {
    const catKey = this.normalizeString(name) || 'divers';
    let categorieId = categoryMap.get(catKey);

    if (!categorieId) {
      try {
        const newCat = await this.db.categorie.create({ data: { nom: name || 'Divers' } });
        categoryMap.set(catKey, newCat.id);
        categorieId = newCat.id;
        newCategoriesCreated.push(name);
      } catch (err: any) {
        if (err.code === 'P2002') {
          const allCats = await this.db.categorie.findMany();
          const existingCat = allCats.find((c) => this.normalizeString(c.nom) === catKey);
          if (existingCat) {
            categoryMap.set(catKey, existingCat.id);
            categorieId = existingCat.id;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    return categorieId!;
  }

  // ── Build category map ────────────────────────────────────────────────────
  private async buildCategoryMap(): Promise<Map<string, string>> {
    const existingCategories = await this.db.categorie.findMany();
    const categoryMap = new Map<string, string>();
    for (const cat of existingCategories) {
      categoryMap.set(this.normalizeString(cat.nom), cat.id);
    }

    // Ensure fallback "Divers" category
    if (!categoryMap.has('divers')) {
      const divers = await this.db.categorie.create({ data: { nom: 'Divers' } });
      categoryMap.set('divers', divers.id);
    }

    return categoryMap;
  }

  // ── Import CSV en masse (streaming + batching) ────────────────────────
  async importCsv(filePath: string) {
    // Taille de chaque lot d'insertion Prisma.
    const BATCH_SIZE = 200;
    this.importStatus = { isImporting: true, progress: 0, message: 'Initialisation import CSV...', error: null };

    try {
      // ── 1. Charger la map des catégories existantes en une seule requête ──
      const existingCategories = await this.db.categorie.findMany({
        select: { id: true, nom: true },
      });
      const categoryMap = new Map<string, string>();
      for (const cat of existingCategories) {
        categoryMap.set(cat.nom.toLowerCase().trim(), cat.id);
      }

      // Catégorie de secours "Divers" créée si absente
      if (!categoryMap.has('divers')) {
        const divers = await this.db.categorie.create({ data: { nom: 'Divers' } });
        categoryMap.set('divers', divers.id);
      }

      // ── 2. Lire le CSV depuis le disque (stream → jamais le fichier brut en RAM) ──
      const fd = await fsPromises.open(filePath, 'r');
      const buff = Buffer.alloc(1024);
      await fd.read(buff, 0, 1024, 0);
      await fd.close();
      const firstLine = buff.toString('utf8').split('\n')[0] || '';
      const separator = firstLine.includes(';') ? ';' : ',';

      const allRows: Record<string, string>[] = await new Promise((resolve, reject) => {
        const rows: Record<string, string>[] = [];
        createReadStream(filePath)
          .pipe(csvParser({
            separator,
            mapHeaders: ({ header }: { header: string }) => header.trim().replace(/^\uFEFF/g, '')
          }))
          .on('data', (row) => rows.push(row))
          .on('end', () => resolve(rows))
          .on('error', reject);
      });

      this.importStatus = { isImporting: true, progress: 10, message: 'Lecture des lignes CSV...', error: null };
      if (allRows.length === 0) {
        throw new BadRequestException('Le fichier CSV est vide ou illisible.');
      }


      // ── 3. Traitement par lots de BATCH_SIZE lignes ────────────────────
      let totalImportes = 0;
      let totalIgnores = 0;
      const newCategoriesCreated: string[] = [];

      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);
        this.importStatus.progress = 10 + Math.round((i / allRows.length) * 80);
        this.importStatus.message = `Traitement du lot ${Math.ceil(i/BATCH_SIZE) + 1} / ${Math.ceil(allRows.length/BATCH_SIZE)}...`;

        // ── 3a. Résolution des catégories inconnues du lot en UNE requête ──
        // On collecte toutes les catégories inconnues du lot, on les crée
        // en masse (createMany), puis on récupère leurs IDs en une fois.
        // Remplace le pattern anti-perf "await create() dans un for...of".
        const unknownCatNames = [
          ...new Set(
            batch
              .map((row) =>
                (
                  row['categorieNom'] || row['categorie_nom'] || row['CategorieNom'] ||
                  row['Categorie']    || row['categorie']     || row['Catégorie']     ||
                  row['catégorie']    || ''
                ).trim(),
              )
              // Filtre les catégories inconnues (pas encore dans la map)
              .filter((nom) => nom && !categoryMap.has(nom.toLowerCase())),
          ),
        ];

        if (unknownCatNames.length > 0) {
          await this.db.categorie.createMany({
            data: unknownCatNames.map((nom) => ({ nom })),
            skipDuplicates: true, // sécurité contre les races conditions
          });
          // Récupérer les IDs en une requête pour mettre à jour la map
          const created = await this.db.categorie.findMany({
            where: { nom: { in: unknownCatNames } },
            select: { id: true, nom: true },
          });
          for (const cat of created) {
            const key = cat.nom.toLowerCase().trim();
            if (!categoryMap.has(key)) newCategoriesCreated.push(cat.nom);
            categoryMap.set(key, cat.id);
          }
        }

        // ── 3b. Mapper les lignes en produits valides ──────────────────────
        const productsData: any[] = [];
        for (const row of batch) {
          try {
            // Correspondance flexible des noms de colonnes CSV
            const nomProduit = (
              row['nomProduit'] || row['nom_produit'] || row['NomProduit'] ||
              row['Nom']        || row['nom']          || ''
            ).trim();

            // Ligne sans nom de produit → ignorée (ne fait pas planter le lot)
            if (!nomProduit) { totalIgnores++; continue; }

            const prixDetail    = parseFloat(row['prixDetail']    || row['prix_detail']    || row['PrixDetail'] || row['Prix'] || row['prix'] || '0');
            const prixGros      = parseFloat(row['prixGros']      || row['prix_gros']      || row['PrixGros']   || '0');
            const quantiteStock = parseInt(  row['quantiteStock'] || row['quantite_stock'] || row['QuantiteStock'] || row['Stock'] || row['stock'] || '0', 10);

            // Image principale : supporte "image1", "nomImage", "image"…
            const nomImage  = (row['image1']    || row['nomImage']  || row['nom_image'] || row['NomImage'] || row['Image'] || row['image']  || '').trim();
            // Images supplémentaires : supporte "image2" / "image3"
            const nomImage2 = (row['image2']    || row['nomImage2'] || row['imageUrl2'] || '').trim();
            const nomImage3 = (row['image3']    || row['nomImage3'] || row['imageUrl3'] || '').trim();

            const categorieNom = (
              row['categorieNom'] || row['categorie_nom'] || row['CategorieNom'] ||
              row['Categorie']    || row['categorie']     || row['Catégorie']    ||
              row['catégorie']    || ''
            ).trim();

            // Fiche technique : supporte "lienFicheTechnique" et "urlDatasheet"
            const urlDatasheet = (row['urlDatasheet'] || row['lienFicheTechnique'] || row['datasheet'] || '').trim() || null;

            // Prix promo : supporte "prixPromotionnel" et "prixPromo"
            const prixPromoRaw = parseFloat(row['prixPromo'] || row['prixPromotionnel'] || row['prix_promo'] || '');
            const prixPromo    = (!isNaN(prixPromoRaw) && prixPromoRaw > 0) ? prixPromoRaw : null;

            // Date fin promo : supporte "dateFinPromo" et "finPromo" (DateTime Prisma)
            const finPromoRaw = (row['finPromo'] || row['dateFinPromo'] || row['fin_promo'] || '').trim();
            let finPromo: Date | null = null;
            if (finPromoRaw) {
              const d = new Date(finPromoRaw);
              if (!isNaN(d.getTime())) finPromo = d;
            }

            // Mise en avant : supporte "mettreEnAvant" et "isPopulaire"
            const enAvantRaw  = (row['isPopulaire'] || row['mettreEnAvant'] || row['is_populaire'] || '').trim().toLowerCase();
            const isPopulaire = enAvantRaw === 'true' || enAvantRaw === '1' || enAvantRaw === 'oui';

            const catKey    = categorieNom.toLowerCase() || 'divers';
            const categorieId = categoryMap.get(catKey) ?? categoryMap.get('divers')!;

            productsData.push({
              nomProduit,
              marque:        (row['marque'] || row['Marque'] || '').trim() || '',
              description:   (row['description'] || row['Description'] || '').trim() || null,
              prixDetail:    isNaN(prixDetail)    ? 0 : prixDetail,
              prixGros:      isNaN(prixGros)      ? 0 : prixGros,
              quantiteStock: isNaN(quantiteStock) ? 0 : quantiteStock,
              imageUrl:      nomImage  ? `/uploads/${nomImage}`  : null,
              imageUrl2:     nomImage2 ? `/uploads/${nomImage2}` : null,
              imageUrl3:     nomImage3 ? `/uploads/${nomImage3}` : null,
              urlDatasheet,
              prixPromo,
              finPromo,
              isPopulaire,
              categorieId,
            });
          } catch (rowErr) {
            totalIgnores++;
          }
        }

        // ── 3c. Insertion du lot en base (transaction courte et maîtrisée) ──
        if (productsData.length > 0) {
          const result = await this.db.produit.createMany({
            data: productsData,
            skipDuplicates: true,
          });
          totalImportes += result.count;
          totalIgnores  += productsData.length - result.count;
        }
      }

      const finalMessage = totalImportes > 0
        ? `Import CSV terminé : ${totalImportes} produit(s) importé(s), ${totalIgnores} ignoré(s).`
        : 'Aucun nouveau produit importé (tous existent déjà).';
      
      this.notifications.create('PRODUIT_MAJ', finalMessage).catch(() => {});
      this.importStatus = { isImporting: false, progress: 100, message: finalMessage, error: null };

      return {
        message: finalMessage,
        totalLignesCsv:    allRows.length,
        produitsImportes:  totalImportes,
        produitsIgnores:   totalIgnores,
        nouvellesCategories: newCategoriesCreated,
      };

    } catch (err: any) {
      // Toute exception (Prisma, parsing…) est re-lancée comme exception NestJS.
      // Ceci garantit que NestJS contrôle la réponse HTTP avec les bons en-têtes
      // CORS → le frontend ne voit plus de "Network Error" générique.
      if (err instanceof BadRequestException) {
        this.importStatus = { isImporting: false, progress: 0, message: 'Erreur de requête', error: err.message };
        throw err;
      }
      console.error('[CSV Import] Erreur critique:', err);
      this.importStatus = { isImporting: false, progress: 0, message: 'Erreur fatale serveur', error: err.message };
      throw new InternalServerErrorException(
        `Erreur lors de l'import CSV : ${err?.message ?? 'Erreur inconnue'}`,
      );
    } finally {
      // Nettoyage garanti du fichier temporaire sur disque, succès ou échec.
      await fsPromises.unlink(filePath).catch(() => {});
    }
  }

  // ── Import ZIP (CSV + images) with create-or-update logic ─────────────────
  /**
   * Run async tasks with a concurrency limit.
   * Returns results in the same order as the input tasks.
   */
  private async runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number,
  ): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < tasks.length) {
        const i = nextIndex++;
        results[i] = await tasks[i]();
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, tasks.length) },
      () => worker(),
    );
    await Promise.all(workers);
    return results;
  }

  async importZip(buffer: Buffer) {
    this.importStatus = { isImporting: true, progress: 0, message: 'Extraction du ZIP...', error: null };
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

    // 1. Find ALL CSV files inside the ZIP
    const csvEntries = entries.filter(
      (e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.csv') && !e.entryName.startsWith('__MACOSX'),
    );
    if (csvEntries.length === 0) {
      throw new BadRequestException('Aucun fichier CSV trouvé dans le ZIP.');
    }

    // 2. Build a map of image files: lowercase filename → buffer
    const imageMap = new Map<string, Buffer>();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    for (const entry of entries) {
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX')) continue;
      const name = entry.entryName.split(/[/\\]/).pop()!.toLowerCase();
      if (imageExtensions.some((ext) => name.endsWith(ext))) {
        imageMap.set(name, entry.getData());
      }
    }

    // 3. Parse ALL CSVs and inject filename as category
    const rows: Record<string, string>[] = [];
    for (const csvEntry of csvEntries) {
      const csvBuffer = csvEntry.getData();
      const filename = csvEntry.entryName.split('/').pop() || '';
      const catFromName = filename.replace(/\.csv$/i, '');
      const parsed = await this.parseCsv(csvBuffer);
      
      for (const row of parsed) {
        row['_filenameCategory'] = catFromName; // Provide fallback category
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('Les fichiers CSV dans le ZIP sont vides ou illisibles.');
    }

    const categoryMap = await this.buildCategoryMap();
    const newCategoriesCreated: string[] = [];
    const missingImages = new Set<string>(); // For summary logging later

    this.importStatus = { isImporting: true, progress: 10, message: 'Analyse des catégories...', error: null };

    // ── OPTIMIZATION 0: Batch Category Resolution (Identical to importCsv) ──
    const BATCH_SIZE = 200;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const unknownCatNames = [
        ...new Set(
          batch
            .map((row) => {
               const name = (this.getCol(row, 'categorieNom', 'categorie_nom', 'CategorieNom', 'Categorie', 'categorie', 'Catégorie', 'catégorie') || row['_filenameCategory'] || '').trim();
               return name;
            })
            .filter((nom) => nom && !categoryMap.has(this.normalizeString(nom))),
        ),
      ];

      if (unknownCatNames.length > 0) {
        await this.db.categorie.createMany({
          data: unknownCatNames.map((nom) => ({ nom })),
          skipDuplicates: true,
        });
        const created = await this.db.categorie.findMany({
          where: { nom: { in: unknownCatNames } },
          select: { id: true, nom: true },
        });
        for (const cat of created) {
          const key = this.normalizeString(cat.nom);
          if (!categoryMap.has(key)) newCategoriesCreated.push(cat.nom);
          categoryMap.set(key, cat.id);
        }
      }
    }

    // ── OPTIMIZATION 1: Deduplicate images & upload all in parallel ──
    // Collect all unique image filenames that need uploading
    const imageUploadCache = new Map<string, string>(); // lowercase filename → cloudinary URL
    const imagesToUpload: string[] = [];

    for (const row of rows) {
      const imgs = [
        this.getCol(row, 'image1', 'Image1', 'nomImage', 'nom_image', 'NomImage', 'Image', 'image').trim(),
        this.getCol(row, 'image2', 'Image2').trim(),
        this.getCol(row, 'image3', 'Image3').trim(),
      ];
      for (const val of imgs) {
        if (!val || val.toUpperCase() === 'SUPPRIMER' || val.startsWith('http://') || val.startsWith('https://')) continue;
        const key = val.toLowerCase();
        if (!imageUploadCache.has(key) && imageMap.has(key)) {
          imageUploadCache.set(key, ''); // placeholder
          imagesToUpload.push(key);
        }
      }
    }

    // Upload all unique images in parallel (10 concurrent uploads)
    this.logger.log(`Uploading ${imagesToUpload.length} unique images with concurrency=10...`);
    this.importStatus = { isImporting: true, progress: 20, message: `Upload de ${imagesToUpload.length} images...`, error: null };
    let cFinished = 0;

    const uploadTasks = imagesToUpload.map((key) => async () => {
      const imageBuffer = imageMap.get(key)!;
      try {
        const url = await this.cloudinary.uploadBuffer(imageBuffer, { folder: 'produits' });
        cFinished++;
        this.importStatus.progress = 20 + Math.round((cFinished / imagesToUpload.length) * 30);
        return { key, url };
      } catch (err) {
        // Silent failure to avoid log flood
        return { key, url: null as string | null };
      }
    });

    const uploadResults = await this.runWithConcurrency(uploadTasks, 10);
    for (const { key, url } of uploadResults) {
      if (url) imageUploadCache.set(key, url);
      else imageUploadCache.delete(key); // remove failed entries
    }

    // ── OPTIMIZATION 2: Bulk-fetch existing products in one query ──
    const existingProducts = await this.db.produit.findMany({
      include: { categorie: true }
    });
    const existingMap = new Map<string, typeof existingProducts[0]>();
    for (const p of existingProducts) {
      const key = `${(p.marque || '').toLowerCase()}::${p.nomProduit.toLowerCase()}`;
      existingMap.set(key, p);
    }

    // ── OPTIMIZATION 3: Build all product data, then batch DB writes ──
    const toCreate: any[] = [];
    const toUpdate: any[] = [];
    const pendingDuplicates: any[] = []; // Stockage temporaire pour historique UI
    let skipped = 0;
    let imagesUploaded = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i % 100 === 0) {
        this.importStatus.progress = 50 + Math.round((i / rows.length) * 30);
        this.importStatus.message = `Préparation du produit ${i}/${rows.length}...`;
      }
      
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
      const categorieNom = this.getCol(row, 'categorieNom', 'categorie_nom', 'CategorieNom', 'Categorie', 'categorie', 'Catégorie', 'catégorie') || row['_filenameCategory'] || '';
      const catKey = this.normalizeString(categorieNom);
      const categorieId = categoryMap.get(catKey) ?? categoryMap.get('divers')!;

      // Look up existing product from pre-fetched map
      const lookupKey = `${(marque || '').toLowerCase()}::${nomProduit.toLowerCase()}`;
      const existing = existingMap.get(lookupKey) || null;

      const image1 = this.getCol(row, 'image1', 'Image1', 'nomImage', 'nom_image', 'NomImage', 'Image', 'image').trim();
      const image2 = this.getCol(row, 'image2', 'Image2', 'nomImage2', 'imageUrl2').trim();
      const image3 = this.getCol(row, 'image3', 'Image3', 'nomImage3', 'imageUrl3').trim();

      // Resolve images using the pre-uploaded cache (no network calls here)
      const imageUrls = this.resolveImportImagesCached(
        [image1, image2, image3],
        imageUploadCache,
        imageMap,
        existing ? [existing.imageUrl, existing.imageUrl2, existing.imageUrl3] : [null, null, null],
        missingImages // Pass the set to collect missing instead of logging
      );
      imagesUploaded += imageUrls.filter((u) => u !== null && u !== undefined).length;

      // Build data object
      const productData: any = {
        nomProduit,
        marque: marque || null,
        categorieId,
        imageUrl: imageUrls[0],
        imageUrl2: imageUrls[1],
        imageUrl3: imageUrls[2],
      };

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
        toUpdate.push({ id: existing.id, data: productData });
        pendingDuplicates.push({ existing, newData: productData });
      } else {
        toCreate.push({
          id: require('crypto').randomUUID(),
          categorieId,
          nomProduit,
          marque: marque || null,
          description: productData.description ?? null,
          dateAjout: new Date(),
          version: 1,
          imageUrl: imageUrls[0] ?? null,
          prixDetail: productData.prixDetail ?? 0,
          prixGros: productData.prixGros ?? 0,
          quantiteStock: productData.quantiteStock ?? 0,
          urlDatasheet: productData.urlDatasheet ?? null,
          finPromo: productData.finPromo ?? null,
          isPopulaire: productData.isPopulaire ?? false,
          prixPromo: productData.prixPromo ?? null,
          imageUrl2: imageUrls[1] ?? null,
          imageUrl3: imageUrls[2] ?? null,
        });
      }
    }

    // ── Batch DB writes in a transaction (chunks of 200) ──
    this.importStatus.message = 'Écriture en base de données (créations)...';
    this.importStatus.progress = 80;

    // Use BATCH_SIZE declared above
    let created = 0;
    let updated = 0;

    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);
      const result = await this.db.produit.createMany({ data: batch, skipDuplicates: true });
      created += result.count;
    }

    this.importStatus.message = `Mise à jour de ${toUpdate.length} produits existants...`;
    for (let i = 0; i < toUpdate.length; i += 50) {
      const batch = toUpdate.slice(i, i + 50);
      await Promise.all(batch.map((u) => this.db.produit.update({ where: { id: u.id }, data: u.data })));
      updated += batch.length;
      this.importStatus.progress = 80 + Math.round((updated / toUpdate.length) * 10);
    }

    this.importStatus.message = `Enregistrement des doublons...`;
    this.importStatus.progress = 90;

    const MAX_DUPLICATES_SAVED = 1000;
    const MAX_DUPLICATES_UI = 100;

    let pendingId: string | null = null;
    const totalDuplicates = pendingDuplicates.length;
    const duplicatesToSave = pendingDuplicates.slice(0, MAX_DUPLICATES_SAVED);
    const extraIgnored = totalDuplicates > MAX_DUPLICATES_SAVED ? totalDuplicates - MAX_DUPLICATES_SAVED : 0;
    
    skipped += extraIgnored; // We definitively skip the ones we don't save

    if (duplicatesToSave.length > 0) {
      // Chunk JSON payloads into groups of 100 to avoid DB connection drop via payload limits
      for (let i = 0; i < duplicatesToSave.length; i += 100) {
        const batch = duplicatesToSave.slice(i, i + 100);
        const pendingRecord = await this.db.pendingImport.create({
          data: {
            data: batch
          }
        });
        if (!pendingId) pendingId = pendingRecord.id; // We return at least the first reference
      }
    }

    if (missingImages.size > 0) {
      this.logger.warn(`${missingImages.size} unique images were missing from the ZIP archive.`);
    }

    const finalMessage = `Import ZIP terminé : ${created} créés, ${updated} mis à jour, ${duplicatesToSave.length} ajoutés au panier des doublons${extraIgnored > 0 ? ` (+ ${extraIgnored} ignorés silencieusement)` : ''}, ${imagesUploaded} images uploadées.`;
    this.notifications.create('PRODUIT_MAJ', finalMessage).catch(() => {});
    this.importStatus = { isImporting: false, progress: 100, message: finalMessage, error: null };

    return {
      message: finalMessage,
      totalLignesCsv: rows.length,
      produitsCreés: created,
      produitsMisAJour: updated,
      produitsEnConflit: duplicatesToSave.length,
      pendingImportId: pendingId, // Allows admin to fetch cart (first batch)
      doublons: pendingDuplicates.slice(0, MAX_DUPLICATES_UI), // Prevent React UI freezes by hard-limiting to 100 items
      produitsIgnorés: skipped,
      imagesUploadées: imagesUploaded,
      nouvellesCategories: newCategoriesCreated,
    };
    } catch (err: any) {
      console.error('[ZIP Import] Erreur critique:', err);
      this.importStatus = { isImporting: false, progress: 0, message: 'Erreur fatale', error: err.message };
      throw err;
    }
  }

  /**
   * Resolve image values using the pre-uploaded cache (synchronous, no network calls).
   */
  private resolveImportImagesCached(
    csvValues: string[],
    uploadCache: Map<string, string>,
    imageMap: Map<string, Buffer>,
    existingUrls: (string | null | undefined)[],
    missingImages?: Set<string>,
  ): (string | null)[] {
    const result: (string | null)[] = [];

    for (let i = 0; i < 3; i++) {
      const val = (csvValues[i] || '').trim();
      const existing = existingUrls[i] || null;

      if (!val) {
        result.push(existing);
      } else if (val.toUpperCase() === 'SUPPRIMER') {
        if (existing) this.cloudinary.deleteByUrl(existing).catch(() => {});
        result.push(null);
      } else if (val.startsWith('http://') || val.startsWith('https://')) {
        if (existing && existing !== val) this.cloudinary.deleteByUrl(existing).catch(() => {});
        result.push(val);
      } else {
        // Look up from pre-uploaded cache
        const cachedUrl = uploadCache.get(val.toLowerCase());
        if (cachedUrl) {
          if (existing) this.cloudinary.deleteByUrl(existing).catch(() => {});
          result.push(cachedUrl);
        } else if (imageMap.has(val.toLowerCase())) {
          // No log here to avoid flood
          result.push(existing);
        } else {
          if (missingImages) missingImages.add(val);
          result.push(existing);
        }
      }
    }

    return result;
  }

  /**
   * Resolve image values from CSV for import (legacy sequential method):
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
        result.push(existing);
      } else if (val.toUpperCase() === 'SUPPRIMER') {
        if (existing) this.cloudinary.deleteByUrl(existing).catch(() => {});
        result.push(null);
      } else if (val.startsWith('http://') || val.startsWith('https://')) {
        if (existing && existing !== val) this.cloudinary.deleteByUrl(existing).catch(() => {});
        result.push(val);
      } else {
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
            result.push(existing);
          }
        } else {
          this.logger.warn(`Image "${val}" not found in ZIP archive`);
          result.push(existing);
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
