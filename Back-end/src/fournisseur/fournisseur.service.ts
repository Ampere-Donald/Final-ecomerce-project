import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';

@Injectable()
export class FournisseurService {
  constructor(private readonly db: DatabaseService) {}

  async create(createFournisseurDto: CreateFournisseurDto) {
    return await this.db.fournisseur.create({
      data: createFournisseurDto,
    });
  }

  async findAll() {
    return await this.db.fournisseur.findMany({
      include: { achats: true },
    });
  }

  async findOne(id: string) {
    const fournisseur = await this.db.fournisseur.findUnique({
      where: { id },
      include: { achats: true },
    });
    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur avec l'id ${id} non trouvé`);
    }
    return fournisseur;
  }

  async update(id: string, updateFournisseurDto: UpdateFournisseurDto) {
    await this.findOne(id);
    return await this.db.fournisseur.update({
      where: { id },
      data: {
        ...updateFournisseurDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.fournisseur.delete({
      where: { id },
    });
  }
}
