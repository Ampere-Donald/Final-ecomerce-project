import { ConflictException } from '@nestjs/common';

type ExpectedOrder = { version?: number; clientId?: string | null };
const include = { lignes: { include: { produit: true } } };

/** Caller owns the transaction. The status claim precedes any stock change. */
export async function cancelOrder(
  tx: any,
  id: string,
  expected: ExpectedOrder = {},
) {
  const changed = await tx.commande.updateMany({
    where: { id, ...expected, statut: { in: ['EN_ATTENTE', 'CONFIRMEE'] } },
    data: {
      statut: 'ANNULEE',
      dateAnnulation: new Date(),
      version: { increment: 1 },
    },
  });
  if (changed.count !== 1)
    throw new ConflictException('Le statut a changé. Actualisez le suivi.');
  const result = await tx.commande.findUnique({ where: { id }, include });
  // Stable product lock order avoids deadlocks between overlapping returns.
  for (const line of [...result.lignes].sort((a, b) =>
    a.produitId.localeCompare(b.produitId),
  )) {
    await tx.produit.update({
      where: { id: line.produitId },
      data: {
        quantiteStock: { increment: line.quantite },
        version: { increment: 1 },
      },
    });
    await tx.mouvementStock.create({
      data: {
        produitId: line.produitId,
        typeMouvement: 'RETOUR',
        quantite: line.quantite,
        motif: `Annulation commande #${result.numeroSuivi}`,
      },
    });
  }
  return result;
}

/** Receipt is for dispatched delivery; in-store handover remains a shop action. */
export async function receiveOrder(
  tx: any,
  id: string,
  expected: ExpectedOrder,
) {
  const changed = await tx.commande.updateMany({
    where: {
      id,
      ...expected,
      statut: 'EN_LIVRAISON',
      modeReception: 'LIVRAISON',
    },
    data: {
      statut: 'LIVREE',
      dateLivraison: new Date(),
      version: { increment: 1 },
    },
  });
  if (changed.count !== 1)
    throw new ConflictException('Le statut a changé. Actualisez le suivi.');
  return tx.commande.findUnique({ where: { id }, include });
}
