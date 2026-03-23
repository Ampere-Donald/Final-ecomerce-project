import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
@Injectable()
export class AchatService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
  ) {}

  async create(createAchatDto: CreateAchatDto, actor?: NotificationActor) {
    const { lignesAchat, ...achatData } = createAchatDto;

    const result = await this.db.$transaction(async (tx: any) => {
      // Créer l'achat avec ses lignes
      const achat = await tx.achat.create({
        data: {
          ...achatData,
          lignesAchat: {
            create: lignesAchat.map((ligne) => ({
              produitId: ligne.produitId,
              quantite: ligne.quantite,
              prixUnitaire: ligne.prixUnitaire,
              sousTotal: ligne.quantite * ligne.prixUnitaire,
            })),
          },
        },
        include: {
          fournisseur: true,
          lignesAchat: { include: { produit: true } },
        },
      });

      // Mettre à jour le stock pour chaque ligne
      for (const ligne of lignesAchat) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: {
            quantiteStock: { increment: ligne.quantite },
            version: { increment: 1 },
          },
        });

        // Créer un mouvement de stock
        await tx.mouvementStock.create({
          data: {
            produitId: ligne.produitId,
            typeMouvement: 'ENTREE',
            quantite: ligne.quantite,
            motif: `Achat #${achat.id}`,
          },
        });
      }

      return achat;
    });

    this.notifications.create('ACHAT_CREE', `Achat enregistré — ${result.montantTotal} FCFA`, actor).catch(() => {});
    return result;
  }

  async findAll() {
    return await this.db.achat.findMany({
      include: {
        fournisseur: true,
        lignesAchat: { include: { produit: true } },
      },
    });
  }

  async findOne(id: string) {
    const achat = await this.db.achat.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        lignesAchat: { include: { produit: true } },
      },
    });
    if (!achat) {
      throw new NotFoundException(`Achat avec l'id ${id} non trouvé`);
    }
    return achat;
  }

  async update(id: string, updateAchatDto: UpdateAchatDto, actor?: NotificationActor) {
    await this.findOne(id);
    const achat = await this.db.achat.update({
      where: { id },
      data: {
        ...updateAchatDto,
        version: { increment: 1 },
      },
      include: {
        fournisseur: true,
        lignesAchat: { include: { produit: true } },
      },
    });
    this.notifications.create('ACHAT_MAJ', `Achat modifié — ${achat.montantTotal} FCFA`, actor).catch(() => {});
    return achat;
  }

  async remove(id: string, actor?: NotificationActor) {
    const achat = await this.findOne(id);
    const result = await this.db.achat.delete({
      where: { id },
    });
    this.notifications.create('ACHAT_SUPPRIME', `Achat supprimé — ${achat.montantTotal} FCFA`, actor).catch(() => {});
    return result;
  }
}
