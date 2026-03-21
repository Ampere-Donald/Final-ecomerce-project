import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateMouvementStockDto } from './dto/create-mouvement-stock.dto';
import { UpdateMouvementStockDto } from './dto/update-mouvement-stock.dto';

@Injectable()
export class MouvementStockService {
  constructor(private readonly db: DatabaseService) {}

  async create(createMouvementStockDto: CreateMouvementStockDto) {
    const { produitId, typeMouvement, quantite, ...rest } =
      createMouvementStockDto;

    return await this.db.$transaction(async (tx: any) => {
      // Créer le mouvement
      const mouvement = await tx.mouvementStock.create({
        data: {
          produitId,
          typeMouvement,
          quantite,
          ...rest,
        },
        include: { produit: true },
      });

      // Mettre à jour le stock selon le type de mouvement
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
          // L'ajustement peut être positif ou négatif
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

      return mouvement;
    });
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

  async update(id: string, updateMouvementStockDto: UpdateMouvementStockDto) {
    await this.findOne(id);
    return await this.db.mouvementStock.update({
      where: { id },
      data: {
        ...updateMouvementStockDto,
        version: { increment: 1 },
      },
      include: { produit: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.mouvementStock.delete({
      where: { id },
    });
  }
}
