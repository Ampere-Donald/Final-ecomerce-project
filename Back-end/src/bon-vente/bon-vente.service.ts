import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationActor } from 'src/notification/notification.service';
import { BonVenteEventsService } from './bon-vente.events.service';
import { CreateBonDto } from './dto/create-bon.dto';

const TVA_TAUX = 0.1925;

@Injectable()
export class BonVenteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: BonVenteEventsService,
  ) {}

  async create(dto: CreateBonDto, actor: NotificationActor) {
    if (!dto.lignes?.length) {
      throw new BadRequestException('Le bon doit contenir au moins une ligne');
    }

    const pending = await this.db.bonVente.findFirst({
      where: { vendeurId: actor.id, statut: 'EN_ATTENTE' },
      select: { id: true, numero: true },
    });
    if (pending) {
      throw new BadRequestException(
        `Un bon est deja en attente pour ce vendeur (${pending.numero})`,
      );
    }

    const bon = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const numero = await this.genererNumeroBon(tx);
      const produits = await tx.produit.findMany({
        where: { id: { in: dto.lignes.map((ligne) => ligne.produitId) } },
      });

      const lignes = dto.lignes.map((ligne) => {
        const produit = produits.find((item) => item.id === ligne.produitId);
        if (!produit) {
          throw new NotFoundException(`Produit ${ligne.produitId} introuvable`);
        }
        return {
          produitId: ligne.produitId,
          nomProduit: produit.nomProduit,
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          sousTotal: ligne.quantite * ligne.prixUnitaire,
        };
      });

      return tx.bonVente.create({
        data: {
          numero,
          vendeurId: actor.id,
          clientId: dto.clientId || undefined,
          methodePaiement: dto.methodePaiement,
          lignes: { create: lignes },
        },
        include: this.defaultInclude(),
      });
    });

    this.events.emit(bon);
    return bon;
  }

  findPending() {
    return this.db.bonVente.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  findMesBons(vendeurId: string) {
    return this.db.bonVente.findMany({
      where: { vendeurId },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async valider(id: string, actor: NotificationActor) {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const bon = await tx.bonVente.findUnique({
        where: { id },
        include: { lignes: true, client: true, vendeur: true },
      });
      if (!bon) throw new NotFoundException('Bon de vente introuvable');
      if (bon.statut !== 'EN_ATTENTE') {
        throw new BadRequestException('Ce bon ne peut plus etre valide');
      }

      const produitIds = bon.lignes.map((ligne) => ligne.produitId);
      const produits = await tx.produit.findMany({
        where: { id: { in: produitIds } },
      });

      for (const ligne of bon.lignes) {
        const produit = produits.find((item) => item.id === ligne.produitId);
        if (!produit) {
          throw new NotFoundException(`Produit ${ligne.produitId} introuvable`);
        }
        if (produit.quantiteStock < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${produit.nomProduit}. Disponible: ${produit.quantiteStock}, demande: ${ligne.quantite}`,
          );
        }
      }

      const montantTotal = bon.lignes.reduce(
        (total, ligne) => total + Number(ligne.sousTotal),
        0,
      );
      const vente = await tx.vente.create({
        data: {
          clientId: bon.clientId || undefined,
          montantTotal,
          methodePaiement: bon.methodePaiement,
          vendeurId: bon.vendeurId,
          lignesVente: {
            create: bon.lignes.map((ligne) => ({
              produitId: ligne.produitId,
              quantite: ligne.quantite,
              prixUnitaire: ligne.prixUnitaire,
              sousTotal: ligne.sousTotal,
            })),
          },
        },
      });

      for (const ligne of bon.lignes) {
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
            motif: `Bon ${bon.numero} valide - vente #${vente.id}`,
          },
        });
      }

      await tx.caisse.create({
        data: {
          typeOperation: 'ENTREE',
          montant: montantTotal,
          motif: `Validation ${bon.numero}`,
          venteId: vente.id,
          effectueePar: actor.id,
        },
      });

      const totalTTC = montantTotal;
      const totalHT = totalTTC / (1 + TVA_TAUX);
      const tva = totalTTC - totalHT;
      const numeroFacture = await this.genererNumeroFacture(tx, 'TICKET_CAISSE');

      const facture = await tx.facture.create({
        data: {
          numero: numeroFacture,
          type: 'TICKET_CAISSE',
          bonId: bon.id,
          venteId: vente.id,
          clientId: bon.clientId || undefined,
          vendeurId: bon.vendeurId,
          caissierId: actor.id,
          totalHT,
          tva,
          totalTTC,
          methodePaiement: bon.methodePaiement,
          lignes: {
            create: bon.lignes.map((ligne) => {
              const prixUnitaireTTC = Number(ligne.prixUnitaire);
              const prixUnitaireHT = prixUnitaireTTC / (1 + TVA_TAUX);
              const sousTotalTTC = Number(ligne.sousTotal);
              const sousTotalHT = sousTotalTTC / (1 + TVA_TAUX);
              return {
                nomProduit: ligne.nomProduit,
                quantite: ligne.quantite,
                prixUnitaireHT,
                prixUnitaireTTC,
                sousTotalHT,
                sousTotalTTC,
              };
            }),
          },
        },
        include: {
          vendeur: { select: { id: true, nom: true } },
          caissier: { select: { id: true, nom: true } },
          client: true,
          lignes: true,
          bon: true,
          vente: true,
        },
      });

      const bonValide = await tx.bonVente.update({
        where: { id: bon.id },
        data: {
          statut: 'VALIDE',
          valideeAt: new Date(),
          valideeById: actor.id,
          venteId: vente.id,
        },
        include: this.defaultInclude(),
      });

      const periode = this.getPeriode(new Date());
      await tx.primeVendeur.upsert({
        where: { vendeurId_periode: { vendeurId: bon.vendeurId, periode } },
        create: {
          vendeurId: bon.vendeurId,
          periode,
          nombreTickets: 1,
        },
        update: {
          nombreTickets: { increment: 1 },
        },
      });

      return { bon: bonValide, vente, facture };
    });
  }

  async annuler(id: string, actor: NotificationActor) {
    const bon = await this.db.bonVente.findUnique({ where: { id } });
    if (!bon) throw new NotFoundException('Bon de vente introuvable');
    if (bon.vendeurId !== actor.id) {
      throw new ForbiddenException('Vous ne pouvez annuler que vos propres bons');
    }
    if (bon.statut !== 'EN_ATTENTE') {
      throw new BadRequestException('Seul un bon en attente peut etre annule');
    }

    return this.db.bonVente.update({
      where: { id },
      data: { statut: 'ANNULE' },
      include: this.defaultInclude(),
    });
  }

  private async genererNumeroBon(tx: Prisma.TransactionClient) {
    const year = new Date().getFullYear();
    const prefix = `BON-${year}-`;
    const count = await tx.bonVente.count({
      where: { numero: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async genererNumeroFacture(
    tx: Prisma.TransactionClient,
    type: 'FACTURE' | 'TICKET_CAISSE',
  ) {
    const year = new Date().getFullYear();
    const prefix = type === 'TICKET_CAISSE' ? `TIC-${year}-` : `FAC-${year}-`;
    const count = await tx.facture.count({
      where: { numero: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private getPeriode(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private defaultInclude() {
    return {
      vendeur: { select: { id: true, nom: true, email: true, role: true } },
      valideeBy: { select: { id: true, nom: true, email: true, role: true } },
      client: true,
      lignes: { include: { produit: true } },
    };
  }
}
