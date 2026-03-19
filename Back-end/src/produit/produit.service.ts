import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';

@Injectable()
export class ProduitService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  async create(createProduitDto: CreateProduitDto) {
    const produit = await this.db.produit.create({
      data: createProduitDto,
      include: { categorie: true },
    });
    this.notifications.create('PRODUIT_CREE', `Produit "${produit.nomProduit}" ajouté au catalogue`).catch(() => {});
    return produit;
  }

  async findAll() {
    return await this.db.produit.findMany({
      include: {
        categorie: true,
        attributs: true,
      },
    });
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
    const produit = await this.db.produit.update({
      where: { id },
      data: {
        ...updateProduitDto,
        version: { increment: 1 },
      },
      include: { categorie: true },
    });
    this.notifications.create('PRODUIT_MAJ', `Produit "${produit.nomProduit}" mis à jour`).catch(() => {});
    return produit;
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
