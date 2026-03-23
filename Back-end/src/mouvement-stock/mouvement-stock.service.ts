import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CreateMouvementStockDto } from './dto/create-mouvement-stock.dto';
import { UpdateMouvementStockDto } from './dto/update-mouvement-stock.dto';

@Injectable()
export class MouvementStockService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  async create(createMouvementStockDto: CreateMouvementStockDto, actor?: NotificationActor) {
    const { produitId, typeMouvement, quantite, ...rest } =
      createMouvementStockDto;

    const mouvement = await this.db.$transaction(async (tx: any) => {
      const m = await tx.mouvementStock.create({
        data: {
          produitId,
          typeMouvement,
          quantite,
          ...rest,
        },
        include: { produit: true },
      });

      let stockChange = 0;
      switch (typeMouvement) {
        case 'ENTREE':
        case 'RETOUR':
          stockChange = quantite;
          break;
        case 'SORTIE':
          stockChange = -quantite;
          break;
        case 'AJUSTEMENT':
          stockChange = quantite;
          break;
      }

      await tx.produit.update({
        where: { id: produitId },
        data: {
          quantiteStock: { increment: stockChange },
          version: { increment: 1 },
        },
      });

      return m;
    });

    this.notifications.create(
      'MOUVEMENT_STOCK_CREE',
      `Mouvement stock ${typeMouvement} — ${quantite} unités (${mouvement.produit?.nomProduit || produitId})`,
      actor,
    ).catch(() => {});

    return mouvement;
  }

  async findAll() {
    return await this.db.mouvementStock.findMany({
      include: { produit: true },
      orderBy: { dateMouvement: 'desc' },
    });
  }

  findByVariante(produitId: string) {
    return this.db.mouvementStock.findMany({
      where: { produitId },
      orderBy: { dateMouvement: 'desc' },
    });
  }

  async findOne(id: string) {
    const mouvement = await this.db.mouvementStock.findUnique({
      where: { id },
      include: { produit: true },
    });
    if (!mouvement) {
      throw new NotFoundException(`Mouvement stock avec l'id ${id} non trouvé`);
    }
    return mouvement;
  }

  async update(id: string, updateMouvementStockDto: UpdateMouvementStockDto, actor?: NotificationActor) {
    await this.findOne(id);
    const mouvement = await this.db.mouvementStock.update({
      where: { id },
      data: {
        ...updateMouvementStockDto,
        version: { increment: 1 },
      },
      include: { produit: true },
    });
    this.notifications.create('STOCK_CHANGE', `Mouvement stock modifié — ${mouvement.produit?.nomProduit || id}`, actor).catch(() => {});
    return mouvement;
  }

  async remove(id: string, actor?: NotificationActor) {
    const mouvement = await this.findOne(id);
    const result = await this.db.mouvementStock.delete({
      where: { id },
    });
    this.notifications.create('STOCK_CHANGE', `Mouvement stock supprimé — ${mouvement.produit?.nomProduit || id}`, actor).catch(() => {});
    return result;
  }
}
