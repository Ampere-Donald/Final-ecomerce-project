import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import { inspectTicketStock } from "../ticket-vente/ticket-stock.util";
import { AccepterDevisDto } from "./dto/devis.dto";
import { offerMatches, snapshotProforma } from "./devis-offer";

const orderSelect = {
  id: true,
  numeroSuivi: true,
  statut: true,
  montantTotal: true,
  modeReception: true,
} as const;
const conflict = (
  message = "La proposition a changé. Relisez votre demande avant de confirmer.",
) => new ConflictException(message);

@Injectable()
export class DevisAcceptService {
  constructor(private readonly db: DatabaseService) {}

  async accept(clientId: string, id: string, dto: AccepterDevisDto) {
    if (
      dto.conditionsAcceptees !== true ||
      !Number.isSafeInteger(dto.version) ||
      dto.version < 1
    )
      throw new BadRequestException(
        "Confirmez la proposition et les conditions de réception.",
      );
    // Serialization conflicts restart the whole transaction; no partial order or stock write survives.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const demande = await tx.demandeDevis.findFirst({
              where: { id, clientId },
              include: { commande: { select: orderSelect } },
            });
            if (!demande)
              throw new NotFoundException("Demande de devis introuvable.");
            if (demande.statut === "ACCEPTEE") {
              if (demande.acceptedVersion !== dto.version) throw conflict();
              if (!demande.commande)
                throw conflict(
                  "Cette commande n’est plus disponible. Contactez la boutique avec son numéro; elle ne sera pas recréée.",
                );
              return {
                demandeId: id,
                replayed: true,
                commande: {
                  ...demande.commande,
                  montantTotal: Number(demande.commande.montantTotal),
                },
              };
            }
            if (
              demande.statut !== "ENVOYEE" ||
              demande.version !== dto.version ||
              !demande.proformaId
            )
              throw conflict();
            const reusedKey = await tx.demandeDevis.findUnique({
              where: { acceptRequestId: dto.requestId },
              select: { id: true },
            });
            if (reusedKey)
              throw conflict(
                "Cette tentative ne correspond pas à cette proposition.",
              );
            const authorization = await tx.demandeDevisEvent.findFirst({
              where: {
                demandeId: id,
                acteurType: "ADMIN",
                statut: "ENVOYEE",
                AND: [
                  { details: { path: ["action"], equals: "OFFRE_AUTORISEE" } },
                  { details: { path: ["versionOffre"], equals: dto.version } },
                ],
              },
              select: { id: true },
            });
            if (!authorization)
              throw conflict(
                "La boutique doit actualiser cette proposition avant son acceptation.",
              );
            const proforma = await tx.proforma.findUnique({
              where: { id: demande.proformaId },
              include: { lignes: true },
            });
            if (
              !proforma ||
              proforma.clientId !== clientId ||
              proforma.statut !== "EN_COURS" ||
              proforma.dateExpiration.getTime() <= Date.now()
            )
              throw conflict();
            let offer: ReturnType<typeof snapshotProforma>;
            try {
              offer = snapshotProforma(proforma);
            } catch {
              throw conflict();
            }
            if (!offerMatches(demande.offre, offer)) throw conflict();
            const claim = await tx.proforma.updateMany({
              where: {
                id: proforma.id,
                statut: "EN_COURS",
                dateExpiration: { gt: new Date() },
              },
              data: { statut: "TRANSFORMEE" },
            });
            if (claim.count !== 1) throw conflict();
            const availability = await inspectTicketStock(
              tx as any,
              offer.lignes,
              { lock: true },
            );
            if (availability.some((line) => !line.suffisant))
              throw conflict(
                "Le stock disponible a changé. Contactez la boutique pour actualiser votre proposition.",
              );
            const active = await tx.produit.findMany({
              where: {
                id: { in: offer.lignes.map((line) => line.produitId) },
                estActif: true,
              },
              select: { id: true },
            });
            if (active.length !== offer.lignes.length)
              throw conflict(
                "Une référence n’est plus disponible dans le catalogue.",
              );
            if (proforma.dateExpiration.getTime() <= Date.now())
              throw conflict("Cette proposition a expiré.");
            if (
              demande.modeReception === "LIVRAISON" &&
              !demande.destination?.trim()
            )
              throw conflict("La destination de livraison doit être précisée.");
            for (const line of offer.lignes) {
              const changed = await tx.produit.updateMany({
                where: {
                  id: line.produitId,
                  estActif: true,
                  quantiteStock: { gte: line.quantite },
                },
                data: {
                  quantiteStock: { decrement: line.quantite },
                  version: { increment: 1 },
                },
              });
              if (changed.count !== 1)
                throw conflict(
                  "Le stock disponible a changé. Contactez la boutique pour actualiser votre proposition.",
                );
            }
            const commande = await tx.commande.create({
              data: {
                numeroSuivi: `CMD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
                clientId,
                nomClient: demande.nomClient,
                telephone: demande.telephone,
                modeReception: demande.modeReception,
                adresseLivraison:
                  demande.modeReception === "RETRAIT_MAGASIN"
                    ? "Retrait boutique Akwa, Douala — disponibilité à confirmer"
                    : demande.destination!,
                montantTotal: offer.montantArticles,
                statut: "EN_ATTENTE",
                lignes: { create: offer.lignes },
              },
              select: orderSelect,
            });
            for (const line of offer.lignes)
              await tx.mouvementStock.create({
                data: {
                  produitId: line.produitId,
                  quantite: line.quantite,
                  typeMouvement: "SORTIE",
                  motif:
                    `Commande ${commande.numeroSuivi} — devis ${offer.numero}`.slice(
                      0,
                      255,
                    ),
                },
              });
            const acceptedAt = new Date();
            const changed = await tx.demandeDevis.updateMany({
              where: { id, clientId, statut: "ENVOYEE", version: dto.version },
              data: {
                statut: "ACCEPTEE",
                commandeId: commande.id,
                numeroCommande: commande.numeroSuivi,
                acceptedAt,
                acceptedVersion: dto.version,
                acceptRequestId: dto.requestId,
                version: { increment: 1 },
              },
            });
            if (changed.count !== 1) throw conflict();
            await tx.demandeDevisEvent.create({
              data: {
                demandeId: id,
                acteurId: clientId,
                acteurType: "CLIENT",
                statut: "ACCEPTEE",
                details: {
                  action: "ACCEPTATION",
                  versionOffre: dto.version,
                  commandeId: commande.id,
                  numeroCommande: commande.numeroSuivi,
                  conditionsAcceptees: true,
                  modeReception: demande.modeReception,
                  fraisLivraison: null,
                  delaiLivraison: null,
                },
              },
            });
            // Internal queue notification is committed once with the order. No email or WhatsApp is sent.
            await tx.notification.create({
              data: {
                type: "COMMANDE_CREEE",
                message: `Commande ${commande.numeroSuivi} créée depuis le devis ${offer.numero}. Réception à confirmer.`,
              },
            });
            return {
              demandeId: id,
              replayed: false,
              commande: {
                ...commande,
                montantTotal: Number(commande.montantTotal),
              },
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: any) {
        if ((error.code === "P2034" || error.code === "P2002") && attempt < 2)
          continue;
        if (error.code === "P2034" || error.code === "P2002")
          throw conflict(
            "Une opération concurrente a modifié la proposition. Relisez la demande avant de réessayer.",
          );
        throw error;
      }
    }
    throw conflict();
  }
}
