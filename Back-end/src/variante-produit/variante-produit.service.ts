import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateVarianteProduitDto } from './dto/create-variante-produit.dto';
import { UpdateVarianteProduitDto } from './dto/update-variante-produit.dto';

@Injectable()
export class VarianteProduitService {
  constructor(private readonly db: DatabaseService) {}

  async create(createVarianteProduitDto: CreateVarianteProduitDto) {
    return await this.db.varianteProduit.create({
      data: createVarianteProduitDto,
      include: { produit: true, attributs: true },
    });
  }

  async findAll() {
    return await this.db.varianteProduit.findMany({
      include: {
        produit: { include: { categorie: true } },
        attributs: { include: { attribut: true, valeur: true } },
      },
    });
  }

  findByProduit(produitId: string) {
    return this.db.varianteProduit.findMany({
      where: { produitId },
      include: { attributs: { include: { attribut: true, valeur: true } } },
    });
  }

  async findOne(id: string) {
    const variante = await this.db.varianteProduit.findUnique({
      where: { id },
      include: {
        produit: { include: { categorie: true } },
        attributs: { include: { attribut: true, valeur: true } },
      },
    });
    if (!variante) {
      throw new NotFoundException(
        `Variante produit avec l'id ${id} non trouvée`,
      );
    }
    return variante;
  }

  async update(id: string, updateVarianteProduitDto: UpdateVarianteProduitDto) {
    await this.findOne(id);
    return await this.db.varianteProduit.update({
      where: { id },
      data: {
        ...updateVarianteProduitDto,
        version: { increment: 1 },
      },
      include: { produit: true, attributs: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.varianteProduit.delete({
      where: { id },
    });
  }

  async updateStock(id: string, quantite: number) {
    await this.findOne(id);
    return await this.db.varianteProduit.update({
      where: { id },
      data: {
        quantiteStock: { increment: quantite },
        version: { increment: 1 },
      },
    });
  }
}
