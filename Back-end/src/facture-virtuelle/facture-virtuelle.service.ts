import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { FactureVirtuelleEventsService } from './facture-virtuelle.events.service';
import { CreateFactureVirtuelleDto } from './dto/create-facture-virtuelle.dto';

@Injectable()
export class FactureVirtuelleService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
    private readonly eventsService: FactureVirtuelleEventsService,
  ) {}

  private toNumber(v: any): number {
    if (v instanceof Decimal) return v.toNumber();
    return Number(v) || 0;
  }

  async create(dto: CreateFactureVirtuelleDto, user: any) {
    const facture = await this.db.facture.findUnique({
      where: { id: dto.factureReelleId },
      include: { lignes: true, vente: true },
    });
    if (!facture) throw new NotFoundException('Facture réelle introuvable');
    if (!facture.vente) throw new BadRequestException('Aucune vente liée à cette facture');

    const existing = await this.db.factureVirtuelle.findUnique({
      where: { factureReelleId: dto.factureReelleId },
    });
    if (existing) {
      throw new BadRequestException(
        'Une facture virtuelle existe déjà pour cette vente. Supprimez-la d\'abord si vous souhaitez en créer une nouvelle.',
      );
    }

    const lignes = facture.lignes;
    let pourcentageMax = 0;
    const lignesVirtuelles: Array<{
      nomProduit: string;
      quantite: number;
      prixUnitaireReelTTC: number;
      pourcentageLigne: number;
      prixUnitaireTTC: number;
      sousTotalTTC: number;
    }> = [];

    if (dto.mode === 'GLOBAL') {
      const pct = dto.pourcentageMajoration;
      if (!pct || pct < 1) throw new BadRequestException('Pourcentage de majoration requis (1-200%)');
      pourcentageMax = pct;

      for (const l of lignes) {
        const prixReel = this.toNumber(l.prixUnitaireTTC);
        const prixMajore = Math.round(prixReel * (1 + pct / 100));
        const quantite = l.quantite;
        lignesVirtuelles.push({
          nomProduit: l.nomProduit,
          quantite,
          prixUnitaireReelTTC: prixReel,
          pourcentageLigne: pct,
          prixUnitaireTTC: prixMajore,
          sousTotalTTC: prixMajore * quantite,
        });
      }
    } else {
      if (!dto.majorationsParLigne?.length) {
        throw new BadRequestException('majorationsParLigne requis en mode PAR_LIGNE');
      }
      const pctMap = new Map(dto.majorationsParLigne.map((m) => [m.factureReelleLigneId, m.pourcentage]));

      for (const l of lignes) {
        const pct = pctMap.get(l.id) ?? dto.pourcentageMajoration ?? 0;
        if (pct < 1) throw new BadRequestException(`Pourcentage invalide pour la ligne ${l.nomProduit}`);
        if (pct > pourcentageMax) pourcentageMax = pct;
        const prixReel = this.toNumber(l.prixUnitaireTTC);
        const prixMajore = Math.round(prixReel * (1 + pct / 100));
        const quantite = l.quantite;
        lignesVirtuelles.push({
          nomProduit: l.nomProduit,
          quantite,
          prixUnitaireReelTTC: prixReel,
          pourcentageLigne: pct,
          prixUnitaireTTC: prixMajore,
          sousTotalTTC: prixMajore * quantite,
        });
      }
    }

    const totalVirtuel = lignesVirtuelles.reduce((s, l) => s + l.sousTotalTTC, 0);
    const totalReel = this.toNumber(facture.totalTTC);
    const margeDemarcheur = totalVirtuel - totalReel;
    const autoApproved = pourcentageMax < 50;
    const numero = `${facture.numero} •`;

    const actor: NotificationActor = { id: user.id, nom: user.nom, role: user.role };

    const result = await this.db.factureVirtuelle.create({
      data: {
        numero,
        factureReelleId: facture.id,
        venteId: facture.vente.id,
        clientId: facture.clientId,
        vendeurId: user.id,
        pourcentageMajoration: pourcentageMax,
        totalTTC: totalVirtuel,
        totalReelTTC: totalReel,
        margeDemarcheur,
        modeMajoration: dto.mode,
        statut: autoApproved ? 'APPROUVEE' : 'EN_ATTENTE',
        dateApprobation: autoApproved ? new Date() : undefined,
        approuveurId: autoApproved ? user.id : undefined,
        lignes: {
          create: lignesVirtuelles,
        },
      },
      include: { lignes: true },
    });

    if (!autoApproved) {
      await this.notificationService.create(
        'FACTURE_VIRTUELLE_DEMANDE',
        `Demande de facture virtuelle #${numero} — majoration ${pourcentageMax}% (${margeDemarcheur.toLocaleString('fr-FR')} FCFA) par ${user.nom}`,
        actor,
      );
      this.eventsService.emit(result);
    }

    return result;
  }

  async approuver(id: string, user: any) {
    const fv = await this.db.factureVirtuelle.findUnique({ where: { id }, include: { vendeur: true } });
    if (!fv) throw new NotFoundException('Facture virtuelle introuvable');
    if (fv.statut !== 'EN_ATTENTE') throw new BadRequestException('Seules les factures EN_ATTENTE peuvent être approuvées');

    const result = await this.db.factureVirtuelle.update({
      where: { id },
      data: {
        statut: 'APPROUVEE',
        approuveurId: user.id,
        dateApprobation: new Date(),
      },
      include: { lignes: true },
    });

    await this.notificationService.create(
      'FACTURE_VIRTUELLE_APPROUVEE',
      `Facture virtuelle #${fv.numero} approuvée par ${user.nom}`,
      { id: user.id, nom: user.nom, role: user.role },
    );

    this.eventsService.emit(result);
    return result;
  }

  async refuser(id: string, motif: string, user: any) {
    const fv = await this.db.factureVirtuelle.findUnique({ where: { id }, include: { vendeur: true } });
    if (!fv) throw new NotFoundException('Facture virtuelle introuvable');
    if (fv.statut !== 'EN_ATTENTE') throw new BadRequestException('Seules les factures EN_ATTENTE peuvent être refusées');

    const result = await this.db.factureVirtuelle.update({
      where: { id },
      data: {
        statut: 'REFUSEE',
        motifRefus: motif,
      },
      include: { lignes: true },
    });

    await this.notificationService.create(
      'FACTURE_VIRTUELLE_REFUSEE',
      `Facture virtuelle #${fv.numero} refusée : ${motif}`,
      { id: user.id, nom: user.nom, role: user.role },
    );

    return result;
  }

  async findAll(filters: { statut?: string; vendeurId?: string }, userRole: string, userId: string) {
    const where: any = {};

    if (filters.statut && filters.statut !== 'TOUTES') {
      where.statut = filters.statut;
    }

    if (userRole === 'VENDEUR') {
      where.vendeurId = userId;
    } else if (filters.vendeurId) {
      where.vendeurId = filters.vendeurId;
    }

    const [data, total, enAttente, approuvees, refusees, aggMajoration] = await Promise.all([
      this.db.factureVirtuelle.findMany({
        where,
        include: {
          lignes: true,
          vendeur: { select: { id: true, nom: true, role: true } },
          approuveur: { select: { id: true, nom: true } },
          client: { select: { id: true, nom: true } },
          factureReelle: { select: { id: true, numero: true } },
        },
        orderBy: { dateCreation: 'desc' },
      }),
      this.db.factureVirtuelle.count({ where }),
      this.db.factureVirtuelle.count({ where: { ...where, statut: 'EN_ATTENTE' } }),
      this.db.factureVirtuelle.count({ where: { ...where, statut: 'APPROUVEE' } }),
      this.db.factureVirtuelle.count({ where: { ...where, statut: 'REFUSEE' } }),
      this.db.factureVirtuelle.aggregate({ where, _avg: { pourcentageMajoration: true } }),
    ]);

    return {
      stats: {
        total,
        enAttente,
        approuvees,
        refusees,
        majorationMoyenne: this.toNumber(aggMajoration._avg.pourcentageMajoration),
      },
      data,
    };
  }

  async findOne(id: string) {
    const fv = await this.db.factureVirtuelle.findUnique({
      where: { id },
      include: {
        lignes: true,
        vendeur: { select: { id: true, nom: true, email: true, role: true } },
        approuveur: { select: { id: true, nom: true } },
        client: true,
        factureReelle: { include: { lignes: true } },
        vente: true,
      },
    });
    if (!fv) throw new NotFoundException('Facture virtuelle introuvable');
    return fv;
  }

  async remove(id: string, user: any) {
    const fv = await this.db.factureVirtuelle.findUnique({ where: { id } });
    if (!fv) throw new NotFoundException('Facture virtuelle introuvable');
    if (fv.statut === 'APPROUVEE') {
      throw new BadRequestException('Impossible de supprimer une facture virtuelle approuvée');
    }
    if (user.role === 'VENDEUR' && fv.vendeurId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres factures virtuelles');
    }

    await this.db.factureVirtuelle.delete({ where: { id } });
    return { deleted: true };
  }

  async incrementPrintCount(id: string) {
    const fv = await this.db.factureVirtuelle.findUnique({ where: { id } });
    if (!fv) throw new NotFoundException('Facture virtuelle introuvable');
    if (fv.statut !== 'APPROUVEE') {
      throw new BadRequestException('Seules les factures virtuelles approuvées peuvent être imprimées');
    }

    return this.db.factureVirtuelle.update({
      where: { id },
      data: { printCount: { increment: 1 } },
      select: { printCount: true },
    });
  }
}
