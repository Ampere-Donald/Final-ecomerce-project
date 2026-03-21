import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class FavoriService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(clientId: string) {
    return this.db.favori.findMany({
      where: { clientId },
      include: {
        produit: {
          include: { categorie: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(clientId: string, produitId: string) {
    return this.db.favori.upsert({
      where: { clientId_produitId: { clientId, produitId } },
      create: { clientId, produitId },
      update: {},
      include: { produit: true },
    });
  }

  async remove(clientId: string, produitId: string) {
    await this.db.favori.deleteMany({
      where: { clientId, produitId },
    });
    return { message: 'Favori supprimé' };
  }
}
