import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { createReadStream, existsSync, promises as fsPromises } from 'fs';
import { join, basename } from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const csvParser = require('csv-parser');

@Injectable()
export class ProduitService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
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

  // ── Flash Deals : produits avec promo active ────────────────────────────
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

  // ── Populaires : produits marqués comme populaires ─────────────────────
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

    let orderBy: any = { dateAjout: 'desc' }; // Défaut: plus récents d'abord
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
        // On garde dateAjout desc par défaut si la valeur sort est inconnue
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
    await this.findOne(id);
    return await this.db.produit.delete({
      where: { id },
    });
  }

  // ── Import CSV en masse (streaming + batching) ────────────────────────
  async importCsv(filePath: string) {
    // Taille de chaque lot d'insertion Prisma.
    // 200 lignes × ~10 champs = ~2 000 params → bien en dessous du plafond Postgres (65 535).
    const BATCH_SIZE = 200;

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
      // Les lignes parsées (objets JS légers) sont collectées puis traitées par lots.
      const allRows: Record<string, string>[] = await new Promise((resolve, reject) => {
        const rows: Record<string, string>[] = [];
        createReadStream(filePath)
          .pipe(csvParser({ separator: ';' }))
          .on('data', (row) => rows.push(row))
          .on('end', () => resolve(rows))
          .on('error', reject);
      });

      if (allRows.length === 0) {
        throw new BadRequestException('Le fichier CSV est vide ou illisible.');
      }


      // ── 3. Traitement par lots de BATCH_SIZE lignes ────────────────────
      let totalImportes = 0;
      let totalIgnores = 0;
      const newCategoriesCreated: string[] = [];

      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);

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
              // marque : '' au lieu de null — le champ est non-nullable dans le schéma Prisma
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
            // Ligne malformée → ignorée sans tuer le reste du lot
            totalIgnores++;
            console.warn('[CSV Import] Ligne ignorée (parsing):', rowErr);
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

      return {
        message: totalImportes > 0
          ? 'Import terminé avec succès'
          : 'Aucun nouveau produit importé (tous existent déjà ou ont été ignorés)',
        totalLignesCsv:    allRows.length,
        produitsImportes:  totalImportes,
        produitsIgnores:   totalIgnores,
        nouvellesCategories: newCategoriesCreated,
      };

    } catch (err: any) {
      // Toute exception (Prisma, parsing…) est re-lancée comme exception NestJS.
      // Ceci garantit que NestJS contrôle la réponse HTTP avec les bons en-têtes
      // CORS → le frontend ne voit plus de "Network Error" générique.
      if (err instanceof BadRequestException) throw err;
      console.error('[CSV Import] Erreur critique:', err);
      throw new InternalServerErrorException(
        `Erreur lors de l'import CSV : ${err?.message ?? 'Erreur inconnue'}`,
      );
    } finally {
      // Nettoyage garanti du fichier temporaire sur disque, succès ou échec.
      await fsPromises.unlink(filePath).catch(() => {});
    }
  }

  // ── Nettoyage des imageUrl invalides (fichier absent du disque) ──────
  async cleanupInvalidImages() {
    const uploadsDir = join(process.cwd(), 'uploads');

    const produits = await this.db.produit.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, nomProduit: true, imageUrl: true },
    });

    const invalids: string[] = [];
    let valid = 0;

    for (const prod of produits) {
      const filename = basename(prod.imageUrl!);
      const filePath = join(uploadsDir, filename);
      if (!existsSync(filePath)) {
        invalids.push(prod.id);
      } else {
        valid++;
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
