import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateAttributDto } from './dto/create-attribut.dto';
import { UpdateAttributDto } from './dto/update-attribut.dto';

@Injectable()
export class AttributService {
  constructor(private readonly db: DatabaseService) {}

  async create(createAttributDto: CreateAttributDto) {
    return await this.db.attribut.create({
      data: createAttributDto,
      include: { produit: true },
    });
  }

  async findAll() {
    return await this.db.attribut.findMany({
      include: { produit: true, valeurs: true },
    });
  }

  findByProduit(produitId: string) {
    return this.db.attribut.findMany({
      where: { produitId },
      include: { valeurs: true },
    });
  }

  async findOne(id: string) {
    const attribut = await this.db.attribut.findUnique({
      where: { id },
      include: { produit: true, valeurs: true },
    });
    if (!attribut) {
      throw new NotFoundException(`Attribut avec l'id ${id} non trouvé`);
    }
    return attribut;
  }

  async update(id: string, updateAttributDto: UpdateAttributDto) {
    await this.findOne(id);
    return await this.db.attribut.update({
      where: { id },
      data: {
        ...updateAttributDto,
        version: { increment: 1 },
      },
      include: { produit: true, valeurs: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.attribut.delete({
      where: { id },
    });
  }
}
