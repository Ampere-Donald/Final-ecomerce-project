import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';

@Injectable()
export class VenteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  async create(createVenteDto: CreateVenteDto, actor?: NotificationActor) {
    const { lignesVente, ...venteData } = createVenteDto;

    const result = await this.db.$transaction(async (tx: any) => {
      // Vérifier le stock disponible pour chaque ligne
      for (const ligne of lignesVente) {
        const variante = await tx.produit.findUnique({
          where: { id: ligne.produitId },
        });
        if (!variante) {
          throw new NotFoundException(
            `Produit ${ligne.produitId} non trouvée`,
          );
        }
        if (variante.quantiteStock < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${variante.nomProduit}. Disponible: ${variante.quantiteStock}, Demandé: ${ligne.quantite}`,
          );
        }
      }

      // Créer la vente avec ses lignes
      const vente = await tx.vente.create({
        data: {
          ...venteData,
          vendeurId: actor?.id,
          lignesVente: {
            create: lignesVente.map((ligne) => ({
              produitId: ligne.produitId,
              quantite: ligne.quantite,
              prixUnitaire: ligne.prixUnitaire,
              sousTotal: ligne.quantite * ligne.prixUnitaire,
            })),
          },
        },
        include: {
          client: true,
          lignesVente: { include: { produit: true } },
        },
      });

      // Mettre à jour le stock pour chaque ligne
      for (const ligne of lignesVente) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: {
            quantiteStock: { decrement: ligne.quantite },
            version: { increment: 1 },
          },
        });

        // Créer un mouvement de stock
        await tx.mouvementStock.create({
          data: {
            produitId: ligne.produitId,
            typeMouvement: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Vente #${vente.id}`,
          },
        });
      }

      // Créer une entrée de caisse
      await tx.caisse.create({
        data: {
          typeOperation: 'ENTREE',
          montant: venteData.montantTotal,
          motif: `Vente #${vente.id}`,
          venteId: vente.id,
          effectueePar: actor?.id,
        },
      });

      return vente;
    });

    this.notifications.create('VENTE_CREEE', `Vente enregistrée — ${result.montantTotal} FCFA`, actor).catch(() => {});
    return result;
  }

  async findAll() {
    return await this.db.vente.findMany({
      include: {
        client: true,
        lignesVente: { include: { produit: true } },
      },
    });
  }

  async findOne(id: string) {
    const vente = await this.db.vente.findUnique({
      where: { id },
      include: {
        client: true,
        lignesVente: { include: { produit: true } },
      },
    });
    if (!vente) {
      throw new NotFoundException(`Vente avec l'id ${id} non trouvée`);
    }
    return vente;
  }

  async update(id: string, updateVenteDto: UpdateVenteDto, actor?: NotificationActor) {
    await this.findOne(id);
    const vente = await this.db.vente.update({
      where: { id },
      data: {
        ...updateVenteDto,
        version: { increment: 1 },
      },
      include: {
        client: true,
        lignesVente: { include: { produit: true } },
      },
    });
    this.notifications.create('VENTE_MAJ', `Vente modifiée — ${vente.montantTotal} FCFA`, actor).catch(() => {});
    return vente;
  }

  async remove(id: string, actor?: NotificationActor) {
    const vente = await this.findOne(id);
    const result = await this.db.vente.delete({
      where: { id },
    });
    this.notifications.create('VENTE_MAJ', `Vente supprimée — ${vente.montantTotal} FCFA`, actor).catch(() => {});
    return result;
  }
}
