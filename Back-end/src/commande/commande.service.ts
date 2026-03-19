import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';

@Injectable()
export class CommandeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Generate a human-readable tracking number.
   * Format: CMD-YYYYMMDD-XXXXX
   */
  private generateNumeroSuivi(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CMD-${datePart}-${randomPart}`;
  }

  async create(dto: CreateCommandeDto) {
    const { lignes, ...commandeData } = dto;

    if (!lignes || lignes.length === 0) {
      throw new BadRequestException('La commande doit contenir au moins un article.');
    }

    const result = await this.db.$transaction(async (tx: any) => {
      // 1. Verify product existence and stock for each line
      for (const ligne of lignes) {
        const produit = await tx.produit.findUnique({
          where: { id: ligne.produitId },
        });
        if (!produit) {
          throw new NotFoundException(
            `Produit "${ligne.nomProduit}" (${ligne.produitId}) introuvable.`,
          );
        }
        if (produit.quantiteStock < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour "${produit.nomProduit}". Disponible: ${produit.quantiteStock}, Demandé: ${ligne.quantite}`,
          );
        }
      }

      // 2. Create the order with nested line items
      const commande = await tx.commande.create({
        data: {
          numeroSuivi: this.generateNumeroSuivi(),
          nomClient: commandeData.nomClient,
          telephone: commandeData.telephone,
          adresseLivraison: commandeData.adresseLivraison,
          montantTotal: commandeData.montantTotal,
          modeReception: commandeData.modeReception,
          clientId: commandeData.clientId || undefined,
          lignes: {
            create: lignes.map((ligne) => ({
              produitId: ligne.produitId,
              nomProduit: ligne.nomProduit,
              quantite: ligne.quantite,
              prixUnitaire: ligne.prixUnitaire,
              sousTotal: ligne.quantite * ligne.prixUnitaire,
            })),
          },
        },
        include: {
          lignes: { include: { produit: true } },
        },
      });

      // 3. Decrement stock and create stock movement entries
      for (const ligne of lignes) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: {
            quantiteStock: { decrement: ligne.quantite },
            version: { increment: 1 },
          },
        });

        await tx.mouvementStock.create({
          data: {
            produitId: ligne.produitId,
            typeMouvement: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Commande e-commerce #${commande.numeroSuivi}`,
          },
        });
      }

      return commande;
    });

    this.notifications.create('COMMANDE_CREEE', `Nouvelle commande ${result.numeroSuivi} de ${result.nomClient} (${result.montantTotal} FCFA)`).catch(() => {});
    return result;
  }

  async findAll() {
    return await this.db.commande.findMany({
      include: {
        lignes: { include: { produit: true } },
      },
      orderBy: { dateCommande: 'desc' },
    });
  }

  async findOne(id: string) {
    const commande = await this.db.commande.findUnique({
      where: { id },
      include: {
        lignes: { include: { produit: true } },
      },
    });
    if (!commande) {
      throw new NotFoundException(`Commande avec l'id ${id} non trouvée`);
    }
    return commande;
  }

  async update(id: string, dto: UpdateCommandeDto) {
    await this.findOne(id);
    const commande = await this.db.commande.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
      include: {
        lignes: { include: { produit: true } },
      },
    });
    if (dto.statut) {
      this.notifications.create('COMMANDE_STATUT', `Commande ${commande.numeroSuivi} → ${dto.statut}`).catch(() => {});
    }
    return commande;
  }

  /** Get orders belonging to a specific client */
  async findByClient(clientId: string) {
    return this.db.commande.findMany({
      where: { clientId },
      include: { lignes: { include: { produit: true } } },
      orderBy: { dateCommande: 'desc' },
    });
  }

  /** Cancel an order (business rules enforced) */
  async cancel(id: string) {
    const commande = await this.findOne(id);

    if (commande.statut === 'ANNULEE') {
      throw new BadRequestException('Cette commande est déjà annulée.');
    }
    if (commande.statut === 'EN_LIVRAISON') {
      throw new BadRequestException('Impossible d\'annuler une commande en cours de livraison.');
    }
    if (commande.statut === 'LIVREE') {
      throw new BadRequestException('Impossible d\'annuler une commande déjà livrée.');
    }

    const updated = await this.db.commande.update({
      where: { id },
      data: { statut: 'ANNULEE', version: { increment: 1 } },
      include: { lignes: { include: { produit: true } } },
    });

    this.notifications.create('COMMANDE_STATUT', `Commande ${updated.numeroSuivi} annulée par le client`).catch(() => {});
    return updated;
  }
}
