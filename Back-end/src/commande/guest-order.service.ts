import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { guestTokenHash } from './guest-access';
import { customerOrder } from './customer-order';
import { MailService } from '../auth/mail.service';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { eligibleGuestAction } from './guest-action.service';

@Injectable()
export class GuestOrderService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
  ) {}

  channels() {
    return { email: this.mail.guestRecoveryAvailable(), sms: false };
  }

  async read(token: string) {
    const hash = guestTokenHash(token);
    if (!hash) return this.unavailable();
    // One statement checks capability, expiry, revocation and guest ownership.
    const grant = await this.db.commandeGuestAccess.findFirst({
      where: {
        tokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        commande: { clientId: null },
      },
      include: {
        commande: { include: { lignes: { include: { produit: true } } } },
      },
    });
    if (!grant) return this.unavailable();
    const full = customerOrder(grant.commande);
    // A read capability does not grant account identity, contact export or actions.
    const { nomClient, telephone, adresseLivraison, clientId, ...commande } =
      full;
    void nomClient;
    void telephone;
    void adresseLivraison;
    void clientId;
    return {
      commande,
      access: {
        scope: 'read',
        expiresAt: grant.expiresAt,
        canCancel: false,
        canConfirmReception: false,
        canLinkAccount: false,
      },
      recovery: {
        channels: this.channels(),
        emailRecorded: !!grant.recoveryEmail,
      },
      linking: {
        available: !!grant.recoveryEmail && this.mail.guestRecoveryAvailable(),
      },
      actions: {
        canRequestCancel:
          !!grant.recoveryEmail &&
          this.mail.guestRecoveryAvailable() &&
          eligibleGuestAction(grant.commande, 'CANCEL'),
        canRequestReception:
          !!grant.recoveryEmail &&
          this.mail.guestRecoveryAvailable() &&
          eligibleGuestAction(grant.commande, 'RECEIVE'),
      },
    };
  }

  /** Administrative summary deliberately excludes keys, digests, codes and email. */
  async adminStatus(commandeId: string) {
    const order = await this.db.commande.findUnique({
      where: { id: commandeId },
      select: {
        clientId: true,
        guestAccess: {
          select: {
            issuedAt: true,
            expiresAt: true,
            revokedAt: true,
            reason: true,
            version: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');
    const grant = order.guestAccess;
    const state = order.clientId
      ? grant
        ? 'LINKED'
        : 'ACCOUNT'
      : !grant
        ? 'NO_ACCESS'
        : grant.revokedAt
          ? 'REVOKED'
          : grant.expiresAt <= new Date()
            ? 'EXPIRED'
            : 'ACTIVE';
    return {
      state,
      grant,
      canRevoke: !!grant && !order.clientId && !grant.revokedAt,
      channels: this.channels(),
    };
  }

  async revoke(
    commandeId: string,
    actorId: string,
    reason?: string,
    expectedVersion?: number,
  ) {
    await this.db.$transaction(async (tx) => {
      // Same lock order as linking/actions: a stale screen cannot revoke a rotated access.
      await tx.$queryRaw`SELECT id FROM commande WHERE id = ${commandeId} FOR UPDATE`;
      await tx.$queryRaw`SELECT commande_id FROM commande_guest_access WHERE commande_id = ${commandeId} FOR UPDATE`;
      const grant = await tx.commandeGuestAccess.findUnique({
        where: { commandeId },
        include: { commande: { select: { clientId: true } } },
      });
      if (!grant)
        throw new NotFoundException(
          'Cette commande ne possède pas d’accès invité.',
        );
      // Exact retries retain the first actor, date and reason; never revoke account access.
      if (grant.revokedAt) return;
      if (
        grant.commande.clientId ||
        (expectedVersion !== undefined && grant.version !== expectedVersion)
      )
        throw new ConflictException(
          'L’accès a changé. Actualisez son état avant de révoquer.',
        );
      const now = new Date();
      await tx.commandeGuestAccess.update({
        where: { commandeId },
        data: {
          revokedAt: now,
          revokedBy: actorId,
          reason: reason?.trim() || 'Révocation boutique',
          version: { increment: 1 },
        },
      });
      await tx.commandeGuestChallenge.updateMany({
        where: { commandeId, consumedAt: null },
        data: { consumedAt: now },
      });
    });
    return { revoked: true };
  }

  // A tracking number is never enough. Only the address recorded at checkout
  // receives a one-use code; unknown references produce the same response.
  async requestRecovery(numeroSuivi: string, email: string) {
    const id = randomUUID();
    const response = {
      challengeId: id,
      message:
        'Si ces informations correspondent à une commande invitée, un code a été envoyé à l’email enregistré.',
    };
    if (!this.mail.guestRecoveryAvailable())
      return {
        available: false,
        message:
          'La récupération par email est indisponible. Contactez la boutique.',
      };
    const code = randomInt(0, 100000000).toString().padStart(8, '0');
    const challenge = await this.db.$transaction(async (tx) => {
      const grant = await tx.commandeGuestAccess.findFirst({
        where: {
          recoveryEmail: email.trim().toLowerCase(),
          revokedAt: null,
          commande: { numeroSuivi: numeroSuivi.trim(), clientId: null },
        },
      });
      if (!grant) return null;
      await tx.$queryRaw`SELECT commande_id FROM commande_guest_access WHERE commande_id = ${grant.commandeId} FOR UPDATE`;
      const current = await tx.commandeGuestAccess.findUnique({
        where: { commandeId: grant.commandeId },
        include: { commande: true },
      });
      if (!current || current.revokedAt || current.commande.clientId)
        return null;
      const now = new Date();
      const recent = await tx.commandeGuestChallenge.findMany({
        where: {
          commandeId: grant.commandeId,
          createdAt: { gt: new Date(now.getTime() - 3600000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
      if (
        recent.length >= 3 ||
        (recent[0] && now.getTime() - recent[0].createdAt.getTime() < 60000)
      )
        return null;
      await tx.commandeGuestChallenge.updateMany({
        where: { commandeId: grant.commandeId, consumedAt: null },
        data: { consumedAt: now },
      });
      return tx.commandeGuestChallenge.create({
        data: {
          id,
          commandeId: grant.commandeId,
          codeHash: this.codeHash(id, code),
          expiresAt: new Date(now.getTime() + 600000),
        },
      });
    });
    if (challenge) {
      const delivered = await this.mail.sendGuestAccessCode(
        email.trim().toLowerCase(),
        code,
      );
      await this.db.commandeGuestChallenge.update({
        where: { id },
        data: delivered ? { delivered: true } : { consumedAt: new Date() },
      });
    }
    return response;
  }

  async recover(id: string, code: string, newKey: string) {
    const tokenHash = guestTokenHash(newKey);
    if (!tokenHash) return this.unavailable();
    // Commit failed attempts as well as successful consumption. Throwing within
    // the transaction would roll back the brute-force counter.
    const result = await this.db.$transaction(async (tx) => {
      const challenge = await tx.commandeGuestChallenge.findUnique({
        where: { id },
      });
      if (!challenge) return null;
      await tx.$queryRaw`SELECT commande_id FROM commande_guest_access WHERE commande_id = ${challenge.commandeId} FOR UPDATE`;
      const current = await tx.commandeGuestChallenge.findUnique({
        where: { id },
      });
      const grant = await tx.commandeGuestAccess.findUnique({
        where: { commandeId: challenge.commandeId },
        include: { commande: true },
      });
      const now = new Date();
      if (
        !current ||
        current.purpose !== 'RECOVER' ||
        !grant ||
        !current.delivered ||
        current.consumedAt ||
        current.attempts >= 5 ||
        current.expiresAt <= now ||
        grant.revokedAt ||
        grant.commande.clientId
      )
        return null;
      const correct =
        /^\d{8}$/.test(code) &&
        timingSafeEqual(
          Buffer.from(current.codeHash, 'hex'),
          Buffer.from(this.codeHash(id, code), 'hex'),
        );
      await tx.commandeGuestChallenge.update({
        where: { id },
        data: {
          attempts: { increment: 1 },
          ...(correct || current.attempts >= 4 ? { consumedAt: now } : {}),
        },
      });
      if (!correct) return null;
      // Key reuse cannot cross orders or revive a previously shared link.
      if (
        tokenHash === grant.tokenHash ||
        (await tx.commandeGuestAccess.findUnique({ where: { tokenHash } }))
      )
        return null;
      return tx.commandeGuestAccess.update({
        where: { commandeId: grant.commandeId },
        data: {
          tokenHash,
          issuedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 86400000),
          version: { increment: 1 },
        },
        select: { expiresAt: true },
      });
    });
    if (!result) return this.unavailable();
    return { scope: 'read', expiresAt: result.expiresAt };
  }

  private codeHash(id: string, code: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Recovery signing secret unavailable');
    return createHmac('sha256', secret).update(`${id}:${code}`).digest('hex');
  }

  private unavailable(): never {
    throw new UnauthorizedException({
      code: 'GUEST_ACCESS_UNAVAILABLE',
      message:
        'Accès indisponible ou expiré. Contactez la boutique pour récupérer votre suivi.',
    });
  }
}
