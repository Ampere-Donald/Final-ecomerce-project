import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService, NotificationActor } from 'src/notification/notification.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { validerLignePrix, type LignePrixResult } from 'src/pricing/pricing.util';
import { DocumentNumberService } from 'src/database/document-number.service';

@Injectable()
export class VenteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async create(createVenteDto: CreateVenteDto, actor?: NotificationActor) {
    const { lignesVente, idempotencyKey, ...venteData } = createVenteDto;

    if (idempotencyKey) {
      const existing = await this.db.vente.findUnique({
        where: { idempotencyKey },
        include: { client: true, facture: true, lignesVente: { include: { produit: true } } },
      });
      if (existing) return existing;
    }

    // Filet de sécurité : bornes de prix selon le rôle de l'acteur (si connu)
    const acteur = actor
      ? await this.db.adminUser.findUnique({
          where: { id: actor.id },
          select: { role: true, peutVendreSousDemiGros: true },
        })
      : null;
    const auditById = new Map<string, LignePrixResult>();

    const result = await this.db.$transaction(async (tx: any) => {
      // Vérifier le stock disponible + valider les bornes de prix
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
        if (acteur) {
          auditById.set(
            ligne.produitId,
            validerLignePrix({
              produit: {
                prixGros: variante.prixGros,
                prixDemiGros: variante.prixDemiGros,
                prixDetail: variante.prixDetail,
                cmupActuel: Number(variante.cmupActuel ?? 0),
                nomProduit: variante.nomProduit,
              },
              prix: Number(ligne.prixUnitaire),
              role: acteur.role,
              peutVendreSousDemiGros: acteur.peutVendreSousDemiGros,
              motif: ligne.motifRemise,
            }),
          );
        }
      }

      // Créer la vente avec ses lignes
      const vente = await tx.vente.create({
        data: {
          ...venteData,
          idempotencyKey,
          vendeurId: actor?.id,
          lignesVente: {
            create: lignesVente.map((ligne) => {
              const audit = auditById.get(ligne.produitId);
              return {
                produitId: ligne.produitId,
                quantite: ligne.quantite,
                prixUnitaire: ligne.prixUnitaire,
                sousTotal: ligne.quantite * ligne.prixUnitaire,
                prixReference: audit?.prixReference ?? null,
                bandePrix: audit?.bandePrix ?? null,
                motifRemise: audit?.motifRemise ?? null,
              };
            }),
          },
        },
        include: {
          client: true,
          lignesVente: { include: { produit: true } },
        },
      });

      // Décrémenter le stock de façon atomique (interdit stock négatif)
      for (const ligne of lignesVente) {
        const updated = await tx.produit.updateMany({
          where: { id: ligne.produitId, quantiteStock: { gte: ligne.quantite } },
          data: {
            quantiteStock: { decrement: ligne.quantite },
            version: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          const p = await tx.produit.findUnique({ where: { id: ligne.produitId }, select: { nomProduit: true, quantiteStock: true } });
          throw new BadRequestException(
            `Stock insuffisant pour ${p?.nomProduit ?? ligne.produitId}. Disponible: ${p?.quantiteStock ?? 0}, Demandé: ${ligne.quantite}`,
          );
        }

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

      if (!actor) return vente;

      const isFacture = vente.client?.typeClient === 'PROFESSIONNEL';
      const totalTTC = Number(vente.montantTotal);
      const totalHT = totalTTC / 1.1925;
      const facture = await tx.facture.create({
        data: {
          numero: await this.documentNumbers.nextAnnual(
            isFacture ? 'FACTURE' : 'TICKET_CAISSE',
            isFacture ? 'FAC-' : 'TIC-',
            tx,
          ),
          type: isFacture ? 'FACTURE' : 'TICKET_CAISSE',
          venteId: vente.id,
          clientId: vente.clientId ?? undefined,
          vendeurId: actor.id,
          caissierId: actor.id,
          totalHT,
          tva: totalTTC - totalHT,
          totalTTC,
          methodePaiement: vente.methodePaiement,
          lignes: {
            create: vente.lignesVente.map((ligne) => {
              const prixTTC = Number(ligne.prixUnitaire);
              const sousTotalTTC = Number(ligne.sousTotal);
              return {
                nomProduit: ligne.produit.nomProduit,
                quantite: ligne.quantite,
                prixUnitaireHT: prixTTC / 1.1925,
                prixUnitaireTTC: prixTTC,
                sousTotalHT: sousTotalTTC / 1.1925,
                sousTotalTTC,
              };
            }),
          },
        },
        include: { lignes: true },
      });

      return { ...vente, facture };
    });

    this.notifications.create('VENTE_CREEE', `Vente enregistrée — ${result.montantTotal} FCFA`, actor).catch(() => {});
    return result;
  }

  async findAll() {
    return await this.db.vente.findMany({
      include: {
        client: true,
        facture: true,
        lignesVente: { include: { produit: true } },
      },
    });
  }

  async findOne(id: string) {
    const vente = await this.db.vente.findUnique({
      where: { id },
      include: {
        client: true,
        facture: true,
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

  async remove(id: string, actor?: NotificationActor, motif?: string) {
    const vente = await this.findOne(id);
    if (vente.annulee) throw new BadRequestException('Cette vente est deja annulee.');
    if (!actor) throw new BadRequestException("L'auteur de l'annulation est requis.");
    const reason = motif?.trim() || 'Annulation administrative';
    const result = await this.db.$transaction(async (tx) => {
      for (const ligne of vente.lignesVente) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { quantiteStock: { increment: ligne.quantite }, version: { increment: 1 } },
        });
        await tx.mouvementStock.create({
          data: {
            produitId: ligne.produitId,
            typeMouvement: 'ENTREE',
            quantite: ligne.quantite,
            motif: `Annulation vente #${vente.id} - ${reason}`,
          },
        });
      }
      await tx.caisse.updateMany({
        where: { venteId: id, annulee: false },
        data: { annulee: true, motifAnnulation: reason, annuleeById: actor.id, annuleeAt: new Date() },
      });
      return tx.vente.update({
        where: { id },
        data: { annulee: true, motifAnnulation: reason, annuleeById: actor.id, annuleeAt: new Date(), version: { increment: 1 } },
        include: { client: true, facture: true, lignesVente: { include: { produit: true } } },
      });
    });
    this.notifications.create('VENTE_MAJ', `Vente annulée — ${vente.montantTotal} FCFA — ${reason}`, actor).catch(() => {});
    return result;
  }
}
