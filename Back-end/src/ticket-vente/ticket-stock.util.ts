import { ConflictException, NotFoundException } from '@nestjs/common';

export interface TicketStockRequest {
  produitId: string;
  quantite: number;
}

export interface TicketStockAvailability {
  produitId: string;
  nomProduit: string;
  stockPhysique: number;
  quantiteReservee: number;
  quantiteDisponible: number;
  quantiteDemandee: number;
  suffisant: boolean;
}

type TicketStockClient = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  produit: {
    findMany: (args: any) => Promise<Array<{ id: string; nomProduit: string; quantiteStock: number }>>;
  };
  ligneTicket: {
    groupBy: (args: any) => Promise<Array<{ produitId: string; _sum: { quantite: number | null } }>>;
  };
};

const requestedQuantities = (lines: TicketStockRequest[]) => {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.produitId, (quantities.get(line.produitId) ?? 0) + line.quantite);
  }
  return quantities;
};

/**
 * Sérialise les créations et encaissements qui concernent les mêmes produits.
 * Le verrou est libé automatiquement à la fin de la transaction PostgreSQL.
 */
export async function lockTicketStock(client: TicketStockClient, productIds: string[]) {
  const uniqueIds = [...new Set(productIds)].sort();
  for (const productId of uniqueIds) {
    await client.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      `newoteg:ticket-stock:${productId}`,
    );
  }
}

export async function inspectTicketStock(
  client: TicketStockClient,
  lines: TicketStockRequest[],
  options: { lock?: boolean } = {},
): Promise<TicketStockAvailability[]> {
  const requested = requestedQuantities(lines);
  const productIds = [...requested.keys()];
  if (options.lock) await lockTicketStock(client, productIds);

  const [products, reservations] = await Promise.all([
    client.produit.findMany({
      where: { id: { in: productIds } },
      select: { id: true, nomProduit: true, quantiteStock: true },
    }),
    client.ligneTicket.groupBy({
      by: ['produitId'],
      where: {
        produitId: { in: productIds },
        ticket: { statut: 'EN_ATTENTE', expiresAt: { gt: new Date() } },
      },
      _sum: { quantite: true },
    }),
  ]);

  if (products.length !== productIds.length) {
    throw new NotFoundException('Au moins un produit est introuvable.');
  }

  const reservedByProduct = new Map(
    reservations.map((reservation) => [
      reservation.produitId,
      Number(reservation._sum.quantite ?? 0),
    ]),
  );

  return products.map((product) => {
    const stockPhysique = Number(product.quantiteStock ?? 0);
    const quantiteReservee = reservedByProduct.get(product.id) ?? 0;
    const quantiteDisponible = Math.max(0, stockPhysique - quantiteReservee);
    const quantiteDemandee = requested.get(product.id) ?? 0;
    return {
      produitId: product.id,
      nomProduit: product.nomProduit,
      stockPhysique,
      quantiteReservee,
      quantiteDisponible,
      quantiteDemandee,
      suffisant: quantiteDemandee <= quantiteDisponible,
    };
  });
}

export function assertTicketStockAvailable(availability: TicketStockAvailability[]) {
  const shortages = availability.filter((line) => !line.suffisant);
  if (shortages.length === 0) return;

  const details = shortages
    .map(
      (line) =>
        `${line.nomProduit} : ${line.quantiteDisponible} disponible(s), ${line.quantiteDemandee} demandée(s)`,
    )
    .join(' | ');

  throw new ConflictException({
    statusCode: 409,
    code: 'STOCK_INSUFFISANT_AVANT_CAISSE',
    message: `Corrigez le panier avant de l'envoyer au caissier. ${details}`,
    shortages,
  });
}

export async function addSellableStock<T extends { id: string; quantiteStock: number }>(
  client: TicketStockClient,
  products: T[],
): Promise<Array<T & { quantiteDisponibleVente: number; quantiteReservee: number }>> {
  if (products.length === 0) return [];
  const availability = await inspectTicketStock(
    client,
    products.map((product) => ({ produitId: product.id, quantite: 0 })),
  );
  const byId = new Map(availability.map((line) => [line.produitId, line]));
  return products.map((product) => ({
    ...product,
    quantiteDisponibleVente:
      byId.get(product.id)?.quantiteDisponible ?? Number(product.quantiteStock ?? 0),
    quantiteReservee: byId.get(product.id)?.quantiteReservee ?? 0,
  }));
}
