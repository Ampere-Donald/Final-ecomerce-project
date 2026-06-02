import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Devise, StatutAchat } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CmupService } from 'src/cmup/cmup.service';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { AnnulerAchatDto } from './dto/annuler-achat.dto';

@Injectable()
export class AchatService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly cmup: CmupService,
  ) {}

  /** Crée un achat BROUILLON. Aucun impact stock/CMUP. */
  async create(dto: CreateAchatDto, actor?: NotificationActor) {
    const taux = new Decimal(dto.tauxVersFcfa.toString());

    const lignesData = dto.lignesAchat.map((l) => {
      const prixUnitaireDevise = new Decimal(l.prixUnitaireDevise.toString());
      const prixUnitaireFcfa =
        dto.devise === Devise.FCFA
          ? prixUnitaireDevise
          : prixUnitaireDevise.mul(taux).toDecimalPlaces(2);
      const sousTotalDevise = prixUnitaireDevise.mul(l.quantite).toDecimalPlaces(2);
      const sousTotalFcfa = prixUnitaireFcfa.mul(l.quantite).toDecimalPlaces(2);

      return {
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaireDevise,
        sousTotalDevise,
        prixUnitaireFcfa,
        sousTotalFcfa,
        coutUnitaireEntreeFcfa: prixUnitaireFcfa,
        prixUnitaire: prixUnitaireFcfa,
        sousTotal: sousTotalFcfa,
      };
    });

    const montantTotalDevise = lignesData
      .reduce((acc, l) => acc.plus(l.sousTotalDevise), new Decimal(0))
      .toDecimalPlaces(2);
    const montantTotalFcfa = lignesData
      .reduce((acc, l) => acc.plus(l.sousTotalFcfa), new Decimal(0))
      .toDecimalPlaces(2);

    const achat = await this.db.achat.create({
      data: {
        fournisseurId: dto.fournisseurId,
        devise: dto.devise,
        tauxChange: taux,
        dateTaux: new Date(),
        sourceTaux: dto.sourceTaux,
        statutPaiement: dto.statutPaiement,
        statutAchat: StatutAchat.BROUILLON,
        montantTotalDevise,
        montantTotalFcfa,
        montantTotal: montantTotalFcfa,
        lignesAchat: { create: lignesData },
      },
      include: {
        fournisseur: true,
        lignesAchat: { include: { produit: true } },
      },
    });

    this.notifications
      .create('ACHAT_CREE', `Brouillon créé — ${achat.montantTotalFcfa} FCFA`, actor)
      .catch(() => {});

    return achat;
  }

  async findAll() {
    return this.db.achat.findMany({
      include: {
        fournisseur: true,
        lignesAchat: { include: { produit: true } },
      },
      orderBy: { dateAchat: 'desc' },
    });
  }

  async findOne(id: string) {
    const achat = await this.db.achat.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        lignesAchat: { include: { produit: true } },
        mouvementsCmup: true,
      },
    });
    if (!achat) throw new NotFoundException(`Achat ${id} introuvable.`);
    return achat;
  }

  /** Modification partielle — seulement si BROUILLON. */
  async update(id: string, dto: UpdateAchatDto, actor?: NotificationActor) {
    const achat = await this.findOne(id);
    if (achat.statutAchat !== StatutAchat.BROUILLON) {
      throw new BadRequestException('Seul un achat BROUILLON peut être modifié.');
    }
    const updated = await this.db.achat.update({
      where: { id },
      data: { ...dto, version: { increment: 1 } },
      include: {
        fournisseur: true,
        lignesAchat: { include: { produit: true } },
      },
    });
    this.notifications
      .create('ACHAT_MAJ', `Brouillon modifié — ${updated.montantTotalFcfa} FCFA`, actor)
      .catch(() => {});
    return updated;
  }

  /**
   * Valide un achat BROUILLON.
   * Applique stock + CMUP dans une seule transaction Prisma.
   * Le taux figé sur l'achat est utilisé pour la conversion finale.
   */
  async valider(id: string, actor?: NotificationActor) {
    const achat = await this.findOne(id);

    if (achat.statutAchat !== StatutAchat.BROUILLON) {
      throw new BadRequestException(
        `L'achat est déjà ${achat.statutAchat} — impossible de valider.`,
      );
    }
    if (!achat.lignesAchat.length) {
      throw new BadRequestException("L'achat n'a aucune ligne.");
    }
    if (achat.tauxChange.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Le taux de change doit être > 0.');
    }

    const taux = achat.tauxChange;
    const devise = achat.devise as Devise;

    const result = await this.db.$transaction(async (tx: any) => {
      // Calculer le coutUnitaireFcfa pour chaque ligne (re-calcul au taux figé)
      const lignesPourCmup = achat.lignesAchat.map((l) => {
        const coutUnitaireFcfa =
          devise === Devise.FCFA
            ? l.prixUnitaireDevise
            : l.prixUnitaireDevise.mul(taux).toDecimalPlaces(2);
        return {
          id: l.id,
          produitId: l.produitId,
          quantite: l.quantite,
          coutUnitaireFcfa,
          sousTotalFcfa: coutUnitaireFcfa.mul(l.quantite).toDecimalPlaces(2),
        };
      });

      // 1. Appliquer CMUP (met à jour Produit + crée MouvementCmup + snapshot LigneAchat CMUP)
      await this.cmup.appliquer(tx, id, lignesPourCmup, devise, taux, actor?.id);

      // 2. Mettre à jour les champs FCFA sur chaque LigneAchat + créer MouvementStock
      for (const l of lignesPourCmup) {
        await tx.ligneAchat.update({
          where: { id: l.id },
          data: {
            prixUnitaireFcfa: l.coutUnitaireFcfa,
            sousTotalFcfa: l.sousTotalFcfa,
            coutUnitaireEntreeFcfa: l.coutUnitaireFcfa,
            prixUnitaire: l.coutUnitaireFcfa,
            sousTotal: l.sousTotalFcfa,
          },
        });

        await tx.mouvementStock.create({
          data: {
            produitId: l.produitId,
            typeMouvement: 'ENTREE',
            quantite: l.quantite,
            motif: `Validation achat #${id}`,
          },
        });

        // Fournisseur sur le produit (non couvert par appliquer())
        await tx.produit.update({
          where: { id: l.produitId },
          data: { dernierFournisseurId: achat.fournisseurId },
        });
      }

      // 3. Recalculer totaux à partir des valeurs finales
      const totalFcfa = lignesPourCmup
        .reduce((acc, l) => acc.plus(l.sousTotalFcfa), new Decimal(0))
        .toDecimalPlaces(2);
      const totalDevise = achat.lignesAchat
        .reduce(
          (acc, l) => acc.plus(l.prixUnitaireDevise.mul(l.quantite)),
          new Decimal(0),
        )
        .toDecimalPlaces(2);

      // 4. Passer l'achat en VALIDE
      return tx.achat.update({
        where: { id },
        data: {
          statutAchat: StatutAchat.VALIDE,
          validatedAt: new Date(),
          validatedById: actor?.id ?? null,
          montantTotalFcfa: totalFcfa,
          montantTotalDevise: totalDevise,
          montantTotal: totalFcfa,
          version: { increment: 1 },
        },
        include: {
          fournisseur: true,
          lignesAchat: { include: { produit: true } },
          mouvementsCmup: true,
        },
      });
    });

    this.notifications
      .create('ACHAT_VALIDE', `Achat validé — ${result.montantTotalFcfa} FCFA`, actor)
      .catch(() => {});

    return result;
  }

  /** Annule un achat. En V1, seul un BROUILLON peut être annulé. */
  async annuler(id: string, dto: AnnulerAchatDto, actor?: NotificationActor) {
    const achat = await this.findOne(id);

    if (achat.statutAchat === StatutAchat.ANNULE) {
      throw new BadRequestException("L'achat est déjà annulé.");
    }
    if (achat.statutAchat === StatutAchat.VALIDE) {
      throw new BadRequestException(
        "L'annulation d'un achat validé n'est pas supportée en V1 (stock déjà impacté).",
      );
    }

    const updated = await this.db.achat.update({
      where: { id },
      data: {
        statutAchat: StatutAchat.ANNULE,
        annuleeAt: new Date(),
        annuleeById: actor?.id ?? null,
        motifAnnulation: dto.motifAnnulation ?? null,
        version: { increment: 1 },
      },
    });

    this.notifications.create('ACHAT_ANNULE', 'Brouillon annulé', actor).catch(() => {});

    return updated;
  }

  /** Suppression physique — seulement si BROUILLON. */
  async remove(id: string, actor?: NotificationActor) {
    const achat = await this.findOne(id);
    if (achat.statutAchat !== StatutAchat.BROUILLON) {
      throw new BadRequestException('Seul un achat BROUILLON peut être supprimé physiquement.');
    }
    const result = await this.db.achat.delete({ where: { id } });
    this.notifications.create('ACHAT_SUPPRIME', 'Brouillon supprimé', actor).catch(() => {});
    return result;
  }
}
