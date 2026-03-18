import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Injectable()
export class CategorieService {
  constructor(private readonly db: DatabaseService) {}

  async create(createCategorieDto: CreateCategorieDto) {
    return await this.db.categorie.create({
      data: createCategorieDto,
    });
  }

  async findAll() {
    return await this.db.categorie.findMany({
      include: { produits: true },
    });
  }

  async findOne(id: string) {
    const categorie = await this.db.categorie.findUnique({
      where: { id },
      include: { produits: true },
    });
    if (!categorie) {
      throw new NotFoundException(`Catégorie avec l'id ${id} non trouvée`);
    }
    return categorie;
  }

  async update(id: string, updateCategorieDto: UpdateCategorieDto) {
    await this.findOne(id);
    return await this.db.categorie.update({
      where: { id },
      data: {
        ...updateCategorieDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.categorie.delete({
      where: { id },
    });
  }
}
