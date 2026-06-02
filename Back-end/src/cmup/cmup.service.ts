import { BadRequestException, Injectable } from '@nestjs/common';
import { Devise } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { DatabaseService } from 'src/database/database.service';
import { PreviewCmupDto } from './dto/cmup.dto';

export interface LigneCmupResult {
  produitId: string;
  nomProduit: string;
  quantiteEntree: number;
  coutUnitaireDevise: Decimal;
  coutUnitaireFcfa: Decimal;
  stockAvant: number;
  stockApres: number;
  cmupAvant: Decimal;
  cmupApres: Decimal;
  valeurStockAvant: Decimal;
  valeurStockApres: Decimal;
}

@Injectable()
export class CmupService {
  constructor(private readonly db: DatabaseService) {}

  /** Calcule le nouveau CMUP selon la formule pondérée. */
  calculer(stockAvant: number, cmupAvant: Decimal, quantiteEntree: number, coutUnitaireFcfa: Decimal): Decimal {
    if (quantiteEntree <= 0) throw new BadRequestException('La quantite entree doit etre > 0.');
    if (coutUnitaireFcfa.lessThan(0)) throw new BadRequestException('Le cout unitaire ne peut pas etre negatif.');

    if (stockAvant === 0) {
      return coutUnitaireFcfa.toDecimalPlaces(2);
    }
    const num = new Decimal(stockAvant).mul(cmupAvant).plus(new Decimal(quantiteEntree).mul(coutUnitaireFcfa));
    const den = new Decimal(stockAvant + quantiteEntree);
    return num.div(den).toDecimalPlaces(2);
  }

  /**
   * Preview CMUP stateless — ne persiste rien, lit le stock/CMUP courant.
   * Appele pendant la saisie du formulaire achat (D4).
   */
  async preview(dto: PreviewCmupDto): Promise<{
    lignes: LigneCmupResult[];
    totalDevise: Decimal;
    totalFcfa: Decimal;
    nombreProduitsImpactes: number;
  }> {
    const taux = new Decimal(dto.tauxVersFcfa.toString());
    const produitIds = dto.lignes.map((l) => l.produitId);

    const produits = await this.db.produit.findMany({
      where: { id: { in: produitIds } },
      select: { id: true, nomProduit: true, quantiteStock: true, cmupActuel: true },
    });
    const produitsById = new Map(produits.map((p) => [p.id, p]));

    let totalDevise = new Decimal(0);
    let totalFcfa = new Decimal(0);

    const lignes: LigneCmupResult[] = dto.lignes.map((ligne) => {
      const produit = produitsById.get(ligne.produitId);
      if (!produit) throw new BadRequestException(`Produit ${ligne.produitId} introuvable.`);

      const coutUnitaireDevise = new Decimal(ligne.prixUnitaireDevise.toString());
      const coutUnitaireFcfa =
        dto.devise === Devise.FCFA
          ? coutUnitaireDevise
          : coutUnitaireDevise.mul(taux).toDecimalPlaces(2);

      const stockAvant = produit.quantiteStock;
      const stockApres = stockAvant + ligne.quantite;
      const cmupAvant = produit.cmupActuel;
      const cmupApres = this.calculer(stockAvant, cmupAvant, ligne.quantite, coutUnitaireFcfa);

      totalDevise = totalDevise.plus(coutUnitaireDevise.mul(ligne.quantite));
      totalFcfa = totalFcfa.plus(coutUnitaireFcfa.mul(ligne.quantite));

      return {
        produitId: produit.id,
        nomProduit: produit.nomProduit,
        quantiteEntree: ligne.quantite,
        coutUnitaireDevise,
        coutUnitaireFcfa,
        stockAvant,
        stockApres,
        cmupAvant,
        cmupApres,
        valeurStockAvant: cmupAvant.mul(stockAvant).toDecimalPlaces(2),
        valeurStockApres: cmupApres.mul(stockApres).toDecimalPlaces(2),
      };
    });

    return {
      lignes,
      totalDevise: totalDevise.toDecimalPlaces(2),
      totalFcfa: totalFcfa.toDecimalPlaces(2),
      nombreProduitsImpactes: lignes.length,
    };
  }

  /**
   * Applique le CMUP apres validation d'un achat.
   * Doit etre appele DANS la transaction de validation (tx passé en parametre).
   * Protege contre les races via updateMany conditionnel sur version.
   */
  async appliquer(
    tx: any,
    achatId: string,
    lignes: Array<{
      id: string;
      produitId: string;
      quantite: number;
      coutUnitaireFcfa: Decimal;
    }>,
    devise: Devise,
    tauxChange: Decimal,
    createdById?: string,
  ): Promise<LigneCmupResult[]> {
    const resultats: LigneCmupResult[] = [];

    for (const ligne of lignes) {
      // Lire le produit avec verrou optimiste (version)
      const produit = await tx.produit.findUnique({
        where: { id: ligne.produitId },
        select: { id: true, nomProduit: true, quantiteStock: true, cmupActuel: true, version: true },
      });
      if (!produit) throw new BadRequestException(`Produit ${ligne.produitId} introuvable.`);

      const stockAvant = produit.quantiteStock;
      const cmupAvant = produit.cmupActuel;
      const stockApres = stockAvant + ligne.quantite;
      const cmupApres = this.calculer(stockAvant, cmupAvant, ligne.quantite, ligne.coutUnitaireFcfa);

      // Update conditionnel avec verrou sur version (evite les races)
      const updated = await tx.produit.updateMany({
        where: { id: produit.id, version: produit.version },
        data: {
          quantiteStock: stockApres,
          cmupActuel: cmupApres,
          dernierCoutAchatFcfa: ligne.coutUnitaireFcfa,
          derniereDeviseAchat: devise,
          dernierAchatAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          `Conflit de concurrence sur le produit ${produit.nomProduit}. Veuillez reessayer.`,
        );
      }

      // Creer le mouvement CMUP
      await tx.mouvementCmup.create({
        data: {
          produitId: produit.id,
          achatId,
          ligneAchatId: ligne.id,
          typeMouvement: 'ENTREE_ACHAT',
          devise,
          tauxChange,
          quantiteEntree: ligne.quantite,
          coutUnitaireFcfa: ligne.coutUnitaireFcfa,
          stockAvant,
          stockApres,
          cmupAvant,
          cmupApres,
          createdById: createdById ?? null,
        },
      });

      // Mettre a jour le snapshot sur la ligne d'achat
      await tx.ligneAchat.update({
        where: { id: ligne.id },
        data: { stockAvant, stockApres, cmupAvant, cmupApres },
      });

      resultats.push({
        produitId: produit.id,
        nomProduit: produit.nomProduit,
        quantiteEntree: ligne.quantite,
        coutUnitaireDevise: devise === Devise.FCFA ? ligne.coutUnitaireFcfa : ligne.coutUnitaireFcfa.div(tauxChange).toDecimalPlaces(6),
        coutUnitaireFcfa: ligne.coutUnitaireFcfa,
        stockAvant,
        stockApres,
        cmupAvant,
        cmupApres,
        valeurStockAvant: cmupAvant.mul(stockAvant).toDecimalPlaces(2),
        valeurStockApres: cmupApres.mul(stockApres).toDecimalPlaces(2),
      });
    }

    return resultats;
  }

  /** Vue d'ensemble CMUP de tous les produits (valeurStock calculee a la volee). */
  async findAll(filters?: { margeMax?: number; deviseFilter?: Devise }) {
    const produits = await this.db.produit.findMany({
      select: {
        id: true,
        nomProduit: true,
        marque: true,
        quantiteStock: true,
        cmupActuel: true,
        prixDetail: true,
        prixGros: true,
        dernierCoutAchatFcfa: true,
        derniereDeviseAchat: true,
        dernierFournisseurId: true,
        dernierAchatAt: true,
        categorie: { select: { nom: true } },
      },
      orderBy: { nomProduit: 'asc' },
    });

    return produits.map((p) => {
      const cmup = p.cmupActuel;
      const prixVente = new Decimal(p.prixDetail?.toString() ?? '0');
      const margeFcfa = prixVente.minus(cmup).toDecimalPlaces(2);
      const tauxMarge = prixVente.isZero()
        ? new Decimal(0)
        : margeFcfa.div(prixVente).mul(100).toDecimalPlaces(1);
      const valeurStock = cmup.mul(p.quantiteStock).toDecimalPlaces(2);

      return {
        ...p,
        cmupActuel: cmup,
        valeurStock,
        margeFcfa,
        tauxMarge,
        badgeMarge:
          margeFcfa.lessThan(0)
            ? 'VENTE_A_PERTE'
            : tauxMarge.lessThan(10)
            ? 'MARGE_FAIBLE'
            : 'MARGE_SAINE',
        cmupInitialise: !cmup.isZero(),
      };
    });
  }

  /** Historique CMUP d'un produit. */
  async historique(produitId: string) {
    return this.db.mouvementCmup.findMany({
      where: { produitId },
      orderBy: { createdAt: 'desc' },
      include: {
        achat: {
          select: {
            id: true,
            devise: true,
            tauxChange: true,
            fournisseur: { select: { nomEntreprise: true } },
          },
        },
      },
    });
  }
}
