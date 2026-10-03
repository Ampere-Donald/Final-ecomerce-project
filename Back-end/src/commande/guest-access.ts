import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CreateCommandeDto } from './dto/create-commande.dto';

export function guestTokenHash(token: unknown): string | null {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
    return null;
  const bytes = Buffer.from(token, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== token) return null;
  return createHash('sha256').update(bytes).digest('hex');
}

export function validateGuestAccessRequest(dto: CreateCommandeDto) {
  if (dto.guestAccessKey === undefined) {
    if (dto.guestEmail !== undefined)
      throw new BadRequestException('Email de suivi sans accès invité.');
    return;
  }
  if (
    !guestTokenHash(dto.guestAccessKey) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      dto.requestId || '',
    )
  )
    throw new BadRequestException(
      'Accès de suivi ou tentative de commande invalide.',
    );
}

/** Runs inside the order transaction. A replay never revives or extends access. */
export async function attachGuestAccess(
  tx: any,
  dto: CreateCommandeDto,
  order: any,
  replay: boolean,
) {
  if (dto.guestAccessKey === undefined) return order;
  if (order.clientId) {
    if (replay && !dto.clientId && !(dto.email && dto.motDePasse))
      return unavailableReplay();
    return order;
  }
  const tokenHash = guestTokenHash(dto.guestAccessKey);
  if (!tokenHash) throw new BadRequestException('Accès de suivi invalide.');
  const now = new Date();
  let grant;
  if (replay) {
    grant = await tx.commandeGuestAccess.findUnique({
      where: { commandeId: order.id },
    });
    if (
      !grant ||
      grant.tokenHash !== tokenHash ||
      grant.revokedAt ||
      grant.expiresAt <= now
    )
      return unavailableReplay();
  } else {
    try {
      grant = await tx.commandeGuestAccess.create({
        data: {
          commandeId: order.id,
          tokenHash,
          recoveryEmail: dto.guestEmail?.trim().toLowerCase() || null,
          expiresAt: new Date(now.getTime() + 30 * 86400000),
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw new ConflictException({
          code: 'GUEST_KEY_REUSED',
          message:
            'Cette clé de suivi est déjà utilisée. Préparez une nouvelle tentative.',
        });
      throw error;
    }
  }
  return {
    ...order,
    guestAccess: { expiresAt: grant.expiresAt, scope: 'read' },
  };
}

function unavailableReplay(): never {
  throw new ConflictException({
    code: 'GUEST_ACCESS_UNAVAILABLE',
    message:
      'La commande est déjà enregistrée mais cet accès est indisponible. Contactez la boutique pour retrouver votre suivi.',
  });
}
