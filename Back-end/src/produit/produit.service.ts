import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const csvParser = require('csv-parser');

@Injectable()
export class ProduitService {
  constructor(private readonly db: DatabaseService) {}

  async create(createProduitDto: CreateProduitDto) {
    const { categorieId, ...rest } = createProduitDto;

    // Convertir finPromo string → Date si présent
    const data: any = { ...rest };
    if (data.finPromo) {
      data.finPromo = new Date(data.finPromo);
    }

    return await this.db.produit.create({
      data: {
        ...data,
        categorie: { connect: { id: categorieId } },
      },
      include: { categorie: true },
    });
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

    // Convertir finPromo string → Date si présent
    if (updateData.finPromo) {
      updateData.finPromo = new Date(updateData.finPromo);
    }
    
    if (categorieId) {
      updateData.categorie = { connect: { id: categorieId } };
    }

    try {
      return await this.db.produit.update({
        where: { id },
        data: updateData,
        include: { categorie: true },
      });
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

  // ── Import CSV en masse ────────────────────────────────────────────────
  async importCsv(buffer: Buffer) {
    // 1. Parse CSV buffer into rows
    const rows: Record<string, string>[] = await new Promise((resolve, reject) => {
      const results: Record<string, string>[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser({ separator: ';' }))
        .on('data', (row) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });

    if (rows.length === 0) {
      throw new BadRequestException('Le fichier CSV est vide ou illisible.');
    }

    // 2. Build category map (name lowercase → id)
    const existingCategories = await this.db.categorie.findMany();
    const categoryMap = new Map<string, string>();
    for (const cat of existingCategories) {
      categoryMap.set(cat.nom.toLowerCase().trim(), cat.id);
    }

    // Ensure a fallback "Divers" category exists
    if (!categoryMap.has('divers')) {
      const divers = await this.db.categorie.create({ data: { nom: 'Divers' } });
      categoryMap.set('divers', divers.id);
    }

    const newCategoriesCreated: string[] = [];

    // 3. Map each row to product data
    const productsData: any[] = [];
    for (const row of rows) {
      // Flexible column name matching (handles various CSV formats)
      const nomProduit = row['nomProduit'] || row['nom_produit'] || row['NomProduit'] || row['Nom'] || row['nom'] || '';
      const marque = row['marque'] || row['Marque'] || '';
      const description = row['description'] || row['Description'] || '';
      const prixDetail = parseFloat(row['prixDetail'] || row['prix_detail'] || row['PrixDetail'] || row['Prix'] || row['prix'] || '0');
      const prixGros = parseFloat(row['prixGros'] || row['prix_gros'] || row['PrixGros'] || '0');
      const quantiteStock = parseInt(row['quantiteStock'] || row['quantite_stock'] || row['QuantiteStock'] || row['Stock'] || row['stock'] || '0', 10);
      const nomImage = row['nomImage'] || row['nom_image'] || row['NomImage'] || row['Image'] || row['image'] || '';
      const categorieNom = (row['categorieNom'] || row['categorie_nom'] || row['CategorieNom'] || row['Categorie'] || row['categorie'] || row['Catégorie'] || row['catégorie'] || '').trim();

      // Skip rows with no product name
      if (!nomProduit.trim()) continue;

      // Resolve category
      const catKey = categorieNom.toLowerCase() || 'divers';
      let categorieId = categoryMap.get(catKey);

      if (!categorieId) {
        // Create category on-the-fly
        const newCat = await this.db.categorie.create({ data: { nom: categorieNom || 'Divers' } });
        categoryMap.set(catKey, newCat.id);
        categorieId = newCat.id;
        newCategoriesCreated.push(categorieNom);
      }

      productsData.push({
        nomProduit: nomProduit.trim(),
        marque: marque.trim() || null,
        description: description.trim() || null,
        prixDetail: isNaN(prixDetail) ? 0 : prixDetail,
        prixGros: isNaN(prixGros) ? 0 : prixGros,
        quantiteStock: isNaN(quantiteStock) ? 0 : quantiteStock,
        imageUrl: nomImage.trim() ? `/uploads/${nomImage.trim()}` : null,
        categorieId,
      });
    }

    if (productsData.length === 0) {
      throw new BadRequestException('Le fichier ne contient aucun produit valide.');
    }

    // 4. Bulk insert
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
}
