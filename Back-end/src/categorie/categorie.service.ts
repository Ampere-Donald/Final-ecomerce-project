import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Injectable()
export class CategorieService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(createCategorieDto: CreateCategorieDto, actor?: NotificationActor) {
    const cat = await this.db.categorie.create({
      data: createCategorieDto,
    });
    this.notifications.create('CATEGORIE_CREEE', `Catégorie "${cat.nom}" créée`, actor).catch(() => {});
    return cat;
  }

  async findAll() {
    return await this.db.categorie.findMany({
      include: {
        _count: {
          select: { produits: true },
        },
      },
      orderBy: { nom: 'asc' },
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

  async update(id: string, updateCategorieDto: UpdateCategorieDto, actor?: NotificationActor) {
    await this.findOne(id);
    const cat = await this.db.categorie.update({
      where: { id },
      data: {
        ...updateCategorieDto,
        version: { increment: 1 },
      },
    });
    this.notifications.create('CATEGORIE_MAJ', `Catégorie "${cat.nom}" mise à jour`, actor).catch(() => {});
    return cat;
  }

  async uploadImage(id: string, imageUrl: string) {
    await this.findOne(id);
    return await this.db.categorie.update({
      where: { id },
      data: { imageUrl, version: { increment: 1 } },
    });
  }

  async remove(id: string, actor?: NotificationActor) {
    const categorie = await this.findOne(id);
    const result = await this.db.categorie.delete({
      where: { id },
    });
    if (categorie.imageUrl) {
      this.cloudinary.deleteByUrl(categorie.imageUrl).catch(() => {});
    }
    this.notifications.create('CATEGORIE_SUPPRIMEE', `Catégorie "${categorie.nom}" supprimée`, actor).catch(() => {});
    return result;
  }
}
