import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCaisseDto } from './dto/create-caisse.dto';
import { UpdateCaisseDto } from './dto/update-caisse.dto';

@Injectable()
export class CaisseService {
  constructor(private readonly db: DatabaseService) {}

  async create(createCaisseDto: CreateCaisseDto) {
    return await this.db.caisse.create({
      data: createCaisseDto,
      include: { vente: true, achat: true },
    });
  }

  async findAll() {
    return await this.db.caisse.findMany({
      include: { vente: true, achat: true },
      orderBy: { dateOperation: 'desc' },
    });
  }

  async findOne(id: string) {
    const caisse = await this.db.caisse.findUnique({
      where: { id },
      include: { vente: true, achat: true },
    });
    if (!caisse) {
      throw new NotFoundException(
        `Opération caisse avec l'id ${id} non trouvée`,
      );
    }
    return caisse;
  }

  async update(id: string, updateCaisseDto: UpdateCaisseDto) {
    await this.findOne(id);
    return await this.db.caisse.update({
      where: { id },
      data: {
        ...updateCaisseDto,
        version: { increment: 1 },
      },
      include: { vente: true, achat: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.caisse.delete({
      where: { id },
    });
  }

  async getSolde() {
    const operations = await this.db.caisse.findMany();
    let solde = 0;
    for (const op of operations) {
      if (op.typeOperation === 'ENTREE') {
        solde += Number(op.montant);
      } else {
        solde -= Number(op.montant);
      }
    }
    return { solde };
  }
}
