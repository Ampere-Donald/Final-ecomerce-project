import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) {}

  async search(query: string) {
    if (!query || query.trim().length < 2) {
      return { commandes: [], produits: [], categories: [], clients: [], fournisseurs: [] };
    }
    const q = query.trim();
    const contains = { contains: q, mode: 'insensitive' as const };

    const [commandes, produits, categories, clients, fournisseurs] =
      await Promise.all([
        this.db.commande.findMany({
          where: {
            OR: [
              { numeroSuivi: contains },
              { nomClient: contains },
              { telephone: contains },
            ],
          },
          take: 5,
          orderBy: { dateCommande: 'desc' },
        }),
        this.db.produit.findMany({
          where: {
            OR: [
              { nomProduit: contains },
              { marque: contains },
            ],
          },
          take: 5,
          include: { categorie: true },
        }),
        this.db.categorie.findMany({
          where: { nom: contains },
          take: 5,
        }),
        this.db.client.findMany({
          where: {
            OR: [
              { nom: contains },
              { prenom: contains },
              { telephone: contains },
            ],
          },
          take: 5,
        }),
        this.db.fournisseur.findMany({
          where: {
            OR: [
              { nomEntreprise: contains },
              { contactNom: contains },
            ],
          },
          take: 5,
        }),
      ]);

    return { commandes, produits, categories, clients, fournisseurs };
  }
}
