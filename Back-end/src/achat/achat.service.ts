import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Devise, StatutAchat, StatutPaiement } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CmupService } from 'src/cmup/cmup.service';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { AnnulerAchatDto } from './dto/annuler-achat.dto';
import { CalculerLotDto } from './dto/calculer-lot.dto';
import { ValiderLotDto } from './dto/valider-lot.dto';

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
        // Pré-saisie issue du CSV (le produit n'est touché qu'à la validation)
        poidsUtilise: l.poids ?? null,
        volumeUtilise: l.volume ?? null,
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

      // 4. Passer l'achat en VALIDE + marquer comme payé
      return tx.achat.update({
        where: { id },
        data: {
          statutAchat: StatutAchat.VALIDE,
          statutPaiement: StatutPaiement.PAYE,
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
    }, { timeout: 30000 });

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

  /**
   * Calcul pur des prix suggérés — aucune écriture en DB.
   * Utilisé par le frontend en temps réel pendant la saisie du lot.
   */
  async calculerLot(achatId: string, dto: CalculerLotDto) {
    const achat = await this.findOne(achatId);
    if (achat.statutAchat !== StatutAchat.BROUILLON) {
      throw new BadRequestException('Seul un achat BROUILLON peut être calculé.');
    }

    // fraisTransport et fraisDouane sont des taux par kg ou par cm³
    const fraisTaux = Number(dto.fraisTransport) + Number(dto.fraisDouane);
    const isVolume  = dto.methodeRepartition === 'VOLUME';

    // Total poids/volume du lot (informatif)
    const totalPV = dto.lignes.reduce((acc, l) => acc + (l.poidsOuVolume ?? 0) * l.quantite, 0);

    // Les produits sont déjà chargés via findOne → lignesAchat.produit : pas de requête supplémentaire
    const produitMap = new Map<string, any>(
      achat.lignesAchat.map((l: any) => [l.produitId, l.produit]),
    );

    const avertissements: string[] = [];

    const resultats = dto.lignes.map((l) => {
      const produit = produitMap.get(l.produitId);
      if (!produit) throw new NotFoundException(`Produit ${l.produitId} introuvable dans cet achat.`);

      const cmup           = Number(produit.cmupActuel ?? 0);
      const pv             = l.poidsOuVolume ?? 0;
      const chargeUnitaire = fraisTaux * pv;

      const base      = cmup + chargeUnitaire;
      const cDetail   = l.coeffDetail   ?? dto.coeffDetailDefault;
      const cDemiGros = l.coeffDemiGros ?? dto.coeffDemiGrosDefault;
      const cGros     = l.coeffGros     ?? dto.coeffGrosDefault;

      if (cGros >= cDemiGros) {
        avertissements.push(`${produit.nomProduit} : coeffGros (${cGros}) ≥ coeffDemiGros (${cDemiGros})`);
      }
      if (cDemiGros >= cDetail) {
        avertissements.push(`${produit.nomProduit} : coeffDemiGros (${cDemiGros}) ≥ coeffDetail (${cDetail})`);
      }
      if (cDetail < 1 || cDemiGros < 1 || cGros < 1) {
        avertissements.push(`${produit.nomProduit} : coefficient < 1 → vente à perte`);
      }
      if (cDetail > 5) {
        avertissements.push(`${produit.nomProduit} : coeffDetail élevé (${cDetail})`);
      }

      return {
        produitId:          l.produitId,
        nomProduit:         produit.nomProduit,
        cmup,
        chargeUnitaire:     Math.round(chargeUnitaire * 100) / 100,
        coeffDetail:        cDetail,
        coeffDemiGros:      cDemiGros,
        coeffGros:          cGros,
        prixDetailSuggere:  Math.round(base * cDetail),
        prixDemiGrosSuggere: Math.round(base * cDemiGros),
        prixGrosSuggere:    Math.round(base * cGros),
        poidsOuVolumeConnu: isVolume ? produit.volume : produit.poids,
        poidsOuVolumeSaisi: pv,
      };
    });

    return { resultats, avertissements, totalPV, fraisTaux };
  }

  /**
   * Valide le lot avec les prix finaux choisis par l'admin.
   * Met à jour prixDetail/prixGros sur chaque produit + sauvegarde historique.
   */
  async validerLot(achatId: string, dto: ValiderLotDto, actor?: NotificationActor) {
    const achat = await this.findOne(achatId);
    if (achat.statutAchat !== StatutAchat.BROUILLON) {
      throw new BadRequestException('Seul un achat BROUILLON peut être validé.');
    }
    if (!achat.lignesAchat.length) {
      throw new BadRequestException("L'achat n'a aucune ligne.");
    }

    // Validation des coefficients (ordre : gros < demi-gros < détail)
    for (const l of dto.lignes) {
      const cD = l.coeffDetail  ?? dto.coeffDetailDefault;
      const cM = l.coeffDemiGros ?? dto.coeffDemiGrosDefault;
      const cG = l.coeffGros    ?? dto.coeffGrosDefault;
      if (cG >= cM) {
        throw new BadRequestException(`coeffGros (${cG}) doit être inférieur à coeffDemiGros (${cM}).`);
      }
      if (cM >= cD) {
        throw new BadRequestException(`coeffDemiGros (${cM}) doit être inférieur à coeffDetail (${cD}).`);
      }
      if (cD < 1 || cM < 1 || cG < 1) {
        throw new BadRequestException('Un coefficient < 1 entraînerait une vente à perte.');
      }
    }

    const taux   = achat.tauxChange;
    const devise = achat.devise as Devise;

    const result = await this.db.$transaction(async (tx: any) => {
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

      // 1. Appliquer CMUP
      await this.cmup.appliquer(tx, achatId, lignesPourCmup, devise, taux, actor?.id);

      // 2. Mettre à jour chaque ligne + produit
      for (const ligneDto of dto.lignes) {
        const ligneAchat = achat.lignesAchat.find((l) => l.id === ligneDto.ligneAchatId);
        if (!ligneAchat) continue;

        const ligneCalc = lignesPourCmup.find((l) => l.id === ligneDto.ligneAchatId)!;

        // Mise à jour LigneAchat (historique)
        await tx.ligneAchat.update({
          where: { id: ligneDto.ligneAchatId },
          data: {
            prixUnitaireFcfa: ligneCalc.coutUnitaireFcfa,
            sousTotalFcfa: ligneCalc.sousTotalFcfa,
            coutUnitaireEntreeFcfa: ligneCalc.coutUnitaireFcfa,
            prixUnitaire: ligneCalc.coutUnitaireFcfa,
            sousTotal: ligneCalc.sousTotalFcfa,
            poidsUtilise: ligneDto.poidsOuVolume ?? null,
            volumeUtilise: ligneDto.poidsOuVolume ?? null,
            coeffDetail:   ligneDto.coeffDetail   ?? null,
            coeffDemiGros: ligneDto.coeffDemiGros  ?? null,
            coeffGros:     ligneDto.coeffGros      ?? null,
            prixDetailFinal:   new Decimal(ligneDto.prixDetailFinal),
            prixDemiGrosFinal: new Decimal(ligneDto.prixDemiGrosFinal),
            prixGrosFinal:     new Decimal(ligneDto.prixGrosFinal),
          },
        });

        // Mise à jour du produit : prix de vente + poids/volume de référence
        const produitUpdate: any = {
          prixDetail:   ligneDto.prixDetailFinal,
          prixDemiGros: ligneDto.prixDemiGrosFinal,
          prixGros:     ligneDto.prixGrosFinal,
          dernierFournisseurId: achat.fournisseurId,
        };
        if (ligneDto.poidsOuVolume != null) {
          if (dto.methodeRepartition === 'POIDS') {
            produitUpdate.poids = ligneDto.poidsOuVolume;
          } else {
            produitUpdate.volume = ligneDto.poidsOuVolume;
          }
        }

        await tx.produit.update({ where: { id: ligneAchat.produitId }, data: produitUpdate });

        // MouvementStock
        await tx.mouvementStock.create({
          data: {
            produitId: ligneAchat.produitId,
            typeMouvement: 'ENTREE',
            quantite: ligneAchat.quantite,
            motif: `Validation achat #${achatId}`,
          },
        });
      }

      // 3. Recalculer totaux
      const totalFcfa = lignesPourCmup
        .reduce((acc, l) => acc.plus(l.sousTotalFcfa), new Decimal(0))
        .toDecimalPlaces(2);
      const totalDevise = achat.lignesAchat
        .reduce((acc, l) => acc.plus(l.prixUnitaireDevise.mul(l.quantite)), new Decimal(0))
        .toDecimalPlaces(2);

      // 4. Passer en VALIDE + sauvegarder la config du lot + marquer comme payé
      return tx.achat.update({
        where: { id: achatId },
        data: {
          statutAchat:    StatutAchat.VALIDE,
          statutPaiement: StatutPaiement.PAYE,
          validatedAt: new Date(),
          validatedById: actor?.id ?? null,
          montantTotalFcfa: totalFcfa,
          montantTotalDevise: totalDevise,
          montantTotal: totalFcfa,
          fraisTransport:      new Decimal(dto.fraisTransport),
          fraisDouane:         new Decimal(dto.fraisDouane),
          methodeRepartition:  dto.methodeRepartition,
          coeffDetailDefault:  dto.coeffDetailDefault,
          coeffDemiGrosDefault: dto.coeffDemiGrosDefault,
          coeffGrosDefault:    dto.coeffGrosDefault,
          version: { increment: 1 },
        },
        include: {
          fournisseur: true,
          lignesAchat: { include: { produit: true } },
          mouvementsCmup: true,
        },
      });
    }, { timeout: 30000 });

    this.notifications
      .create('ACHAT_VALIDE', `Achat validé — ${result.montantTotalFcfa} FCFA`, actor)
      .catch(() => {});

    return result;
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
