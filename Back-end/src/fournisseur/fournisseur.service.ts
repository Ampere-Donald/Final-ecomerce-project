import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';

@Injectable()
export class FournisseurService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  async create(createFournisseurDto: CreateFournisseurDto, actor?: NotificationActor) {
    const fournisseur = await this.db.fournisseur.create({
      data: createFournisseurDto,
    });
    this.notifications.create('FOURNISSEUR_CREE', `Fournisseur "${fournisseur.nomEntreprise}" ajouté`, actor).catch(() => {});
    return fournisseur;
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

  async update(id: string, updateFournisseurDto: UpdateFournisseurDto, actor?: NotificationActor) {
    await this.findOne(id);
    const fournisseur = await this.db.fournisseur.update({
      where: { id },
      data: {
        ...updateFournisseurDto,
        version: { increment: 1 },
      },
    });
    this.notifications.create('FOURNISSEUR_MAJ', `Fournisseur "${fournisseur.nomEntreprise}" modifié`, actor).catch(() => {});
    return fournisseur;
  }

  async remove(id: string, actor?: NotificationActor) {
    const fournisseur = await this.findOne(id);
    const result = await this.db.fournisseur.delete({
      where: { id },
    });
    this.notifications.create('FOURNISSEUR_SUPPRIME', `Fournisseur "${fournisseur.nomEntreprise}" supprimé`, actor).catch(() => {});
    return result;
  }
}
