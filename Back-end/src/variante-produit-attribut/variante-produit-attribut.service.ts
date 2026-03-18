import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateVarianteProduitAttributDto } from './dto/create-variante-produit-attribut.dto';
import { UpdateVarianteProduitAttributDto } from './dto/update-variante-produit-attribut.dto';

@Injectable()
export class VarianteProduitAttributService {
  constructor(private readonly db: DatabaseService) {}

  async create(createDto: CreateVarianteProduitAttributDto) {
    return await this.db.varianteProduitAttribut.create({
      data: createDto,
      include: { varianteProduit: true, attribut: true, valeur: true },
    });
  }

  async findAll() {
    return await this.db.varianteProduitAttribut.findMany({
      include: { varianteProduit: true, attribut: true, valeur: true },
    });
  }

  findByVariante(varianteProduitId: string) {
    return this.db.varianteProduitAttribut.findMany({
      where: { varianteProduitId },
      include: { attribut: true, valeur: true },
    });
  }

  async findOne(id: string) {
    const varianteAttr = await this.db.varianteProduitAttribut.findUnique({
      where: { id },
      include: { varianteProduit: true, attribut: true, valeur: true },
    });
    if (!varianteAttr) {
      throw new NotFoundException(
        `Variante produit attribut avec l'id ${id} non trouvé`,
      );
    }
    return varianteAttr;
  }

  async update(id: string, updateDto: UpdateVarianteProduitAttributDto) {
    await this.findOne(id);
    return await this.db.varianteProduitAttribut.update({
      where: { id },
      data: {
        ...updateDto,
        version: { increment: 1 },
      },
      include: { varianteProduit: true, attribut: true, valeur: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.varianteProduitAttribut.delete({
      where: { id },
    });
  }
}
