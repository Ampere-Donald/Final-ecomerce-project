import { ConflictException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { CreateCommandeDto } from './dto/create-commande.dto';

/** All SQL runs inside the order transaction. The unique insert serializes retries. */
export async function previousOrder(
  tx: any,
  dto: CreateCommandeDto,
  kind: 'standard' | 'checkout',
) {
  if (!dto.requestId) return null; // Preserve legacy clients; the new checkout always sends a key.
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Order request signing secret unavailable');
  const fingerprint = createHmac('sha256', secret)
    .update(
      JSON.stringify({
        kind,
        ...(dto.guestAccessKey !== undefined
          ? {
              guestAccessKey: dto.guestAccessKey,
              guestEmail: dto.guestEmail?.trim().toLowerCase() || null,
            }
          : {}),
        clientId: dto.clientId ?? null,
        nom: dto.nomClient,
        telephone: dto.telephone,
        adresse: dto.adresseLivraison,
        mode: dto.modeReception,
        total: dto.montantTotal,
        email: dto.email ?? null,
        password: dto.motDePasse ?? null,
        lignes: dto.lignes
          .map((l) => ({ id: l.produitId, q: l.quantite, p: l.prixUnitaire }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest('hex');
  const inserted = await tx.$executeRaw`
    INSERT INTO commande_request (request_id, fingerprint)
    VALUES (${dto.requestId}::uuid, ${fingerprint}) ON CONFLICT (request_id) DO NOTHING`;
  if (inserted === 1) return null;
  const rows = await tx.$queryRaw`
    SELECT fingerprint, commande_id FROM commande_request WHERE request_id = ${dto.requestId}::uuid`;
  const row = rows[0];
  if (!row || row.fingerprint !== fingerprint)
    throw new ConflictException({
      code: 'REQUEST_CONFLICT',
      message:
        'Cette tentative ne correspond pas à la commande initiale. Consultez votre suivi ou contactez la boutique.',
    });
  // A deleted order leaves a tombstone: never recreate it from an old retry.
  if (!row.commande_id)
    throw new ConflictException({
      code: 'ORDER_REMOVED',
      message:
        'Cette commande a été retirée de l’historique. Contactez la boutique.',
    });
  return tx.commande.findUniqueOrThrow({
    where: { id: row.commande_id },
    include: { lignes: { include: { produit: true } } },
  });
}

export async function completeOrderRequest(
  tx: any,
  requestId: string | undefined,
  orderId: string,
) {
  if (!requestId) return;
  await tx.$executeRaw`UPDATE commande_request SET commande_id = ${orderId} WHERE request_id = ${requestId}::uuid`;
}
