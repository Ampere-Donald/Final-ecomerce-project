import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';

@Injectable()
export class VenteService {
  constructor(private readonly db: DatabaseService) {}

  async create(createVenteDto: CreateVenteDto) {
    const { lignesVente, ...venteData } = createVenteDto;

    return await this.db.$transaction(async (tx: any) => {
      // Vérifier le stock disponible pour chaque ligne
      for (const ligne of lignesVente) {
        const variante = await tx.varianteProduit.findUnique({
          where: { id: ligne.varianteProduitId },
        });
        if (!variante) {
          throw new NotFoundException(
            `Variante produit ${ligne.varianteProduitId} non trouvée`,
          );
        }
        if (variante.quantiteStock < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${variante.codeVariante}. Disponible: ${variante.quantiteStock}, Demandé: ${ligne.quantite}`,
          );
        }
      }

      // Créer la vente avec ses lignes
      const vente = await tx.vente.create({
        data: {
          ...venteData,
          lignesVente: {
            create: lignesVente.map((ligne) => ({
              varianteProduitId: ligne.varianteProduitId,
              quantite: ligne.quantite,
              prixUnitaire: ligne.prixUnitaire,
              sousTotal: ligne.quantite * ligne.prixUnitaire,
            })),
          },
        },
        include: {
          client: true,
          lignesVente: { include: { varianteProduit: true } },
        },
      });

      // Mettre à jour le stock pour chaque ligne
      for (const ligne of lignesVente) {
        await tx.varianteProduit.update({
          where: { id: ligne.varianteProduitId },
          data: {
            quantiteStock: { decrement: ligne.quantite },
            version: { increment: 1 },
          },
        });

        // Créer un mouvement de stock
        await tx.mouvementStock.create({
          data: {
            varianteProduitId: ligne.varianteProduitId,
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
        },
      });

      return vente;
    });
  }

  async findAll() {
    return await this.db.vente.findMany({
      include: {
        client: true,
        lignesVente: { include: { varianteProduit: true } },
      },
    });
  }

  async findOne(id: string) {
    const vente = await this.db.vente.findUnique({
      where: { id },
      include: {
        client: true,
        lignesVente: { include: { varianteProduit: true } },
      },
    });
    if (!vente) {
      throw new NotFoundException(`Vente avec l'id ${id} non trouvée`);
    }
    return vente;
  }

  async update(id: string, updateVenteDto: UpdateVenteDto) {
    await this.findOne(id);
    return await this.db.vente.update({
      where: { id },
      data: {
        ...updateVenteDto,
        version: { increment: 1 },
      },
      include: {
        client: true,
        lignesVente: { include: { varianteProduit: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.vente.delete({
      where: { id },
    });
  }
}
