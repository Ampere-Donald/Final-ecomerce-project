import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CreateCaisseDto } from './dto/create-caisse.dto';
import { UpdateCaisseDto } from './dto/update-caisse.dto';

@Injectable()
export class CaisseService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  async create(createCaisseDto: CreateCaisseDto, actor?: NotificationActor) {
    const caisse = await this.db.caisse.create({
      data: createCaisseDto,
      include: { vente: true, achat: true },
    });
    this.notifications.create('CAISSE_CREEE', `Opération caisse ${caisse.typeOperation} — ${caisse.montant} FCFA`, actor).catch(() => {});
    return caisse;
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

  async update(id: string, updateCaisseDto: UpdateCaisseDto, actor?: NotificationActor) {
    await this.findOne(id);
    const caisse = await this.db.caisse.update({
      where: { id },
      data: {
        ...updateCaisseDto,
        version: { increment: 1 },
      },
      include: { vente: true, achat: true },
    });
    this.notifications.create('CAISSE_MAJ', `Opération caisse modifiée — ${caisse.montant} FCFA`, actor).catch(() => {});
    return caisse;
  }

  async remove(id: string, actor?: NotificationActor) {
    const caisse = await this.findOne(id);
    const result = await this.db.caisse.delete({
      where: { id },
    });
    this.notifications.create('CAISSE_SUPPRIMEE', `Opération caisse supprimée — ${caisse.motif}`, actor).catch(() => {});
    return result;
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
