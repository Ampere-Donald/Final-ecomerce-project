import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateValeurAttributDto } from './dto/create-valeur-attribut.dto';
import { UpdateValeurAttributDto } from './dto/update-valeur-attribut.dto';

@Injectable()
export class ValeurAttributService {
  constructor(private readonly db: DatabaseService) {}

  async create(createValeurAttributDto: CreateValeurAttributDto) {
    return await this.db.valeurAttribut.create({
      data: createValeurAttributDto,
      include: { attribut: true },
    });
  }

  async findAll() {
    return await this.db.valeurAttribut.findMany({
      include: { attribut: true },
    });
  }

  findByAttribut(attributId: string) {
    return this.db.valeurAttribut.findMany({
      where: { attributId },
    });
  }

  async findOne(id: string) {
    const valeur = await this.db.valeurAttribut.findUnique({
      where: { id },
      include: { attribut: true },
    });
    if (!valeur) {
      throw new NotFoundException(
        `Valeur attribut avec l'id ${id} non trouvée`,
      );
    }
    return valeur;
  }

  async update(id: string, updateValeurAttributDto: UpdateValeurAttributDto) {
    await this.findOne(id);
    return await this.db.valeurAttribut.update({
      where: { id },
      data: {
        ...updateValeurAttributDto,
        version: { increment: 1 },
      },
      include: { attribut: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.valeurAttribut.delete({
      where: { id },
    });
  }
}
