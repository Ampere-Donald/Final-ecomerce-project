import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';

@Injectable()
export class ProduitService {
  constructor(private readonly db: DatabaseService) {}

  async create(createProduitDto: CreateProduitDto) {
    const { categorieId, ...rest } = createProduitDto;
    return await this.db.produit.create({
      data: {
        ...rest,
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
}
