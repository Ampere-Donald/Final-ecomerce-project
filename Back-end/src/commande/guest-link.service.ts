import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../auth/mail.service';
import { guestTokenHash } from './guest-access';

@Injectable()
export class GuestLinkService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
  ) {}

  async request(token: string, clientId: string) {
    if (!this.mail.guestRecoveryAvailable())
      return {
        available: false,
        message: 'Le service email est indisponible. Contactez la boutique.',
      };
    const tokenHash = guestTokenHash(token);
    if (!tokenHash || !clientId) return this.unavailable();
    const id = randomUUID();
    const code = randomInt(0, 100000000).toString().padStart(8, '0');
    const delivery = await this.db.$transaction(async (tx) => {
      const initial = await tx.commandeGuestAccess.findUnique({
        where: { tokenHash },
      });
      if (!initial) return this.unavailable();
      // Consistent order -> access lock ordering; recovery locks only access.
      await tx.$queryRaw`SELECT id FROM commande WHERE id = ${initial.commandeId} FOR UPDATE`;
      await tx.$queryRaw`SELECT commande_id FROM commande_guest_access WHERE commande_id = ${initial.commandeId} FOR UPDATE`;
      const grant = await tx.commandeGuestAccess.findUnique({
        where: { commandeId: initial.commandeId },
        include: { commande: true },
      });
      const now = new Date();
      if (
        !grant ||
        grant.tokenHash !== tokenHash ||
        grant.revokedAt ||
        grant.expiresAt <= now ||
        grant.commande.clientId
      )
        return this.unavailable();
      if (!grant.recoveryEmail)
        throw new BadRequestException({
          code: 'GUEST_EMAIL_MISSING',
          message:
            'Aucun email de récupération n’a été enregistré. Contactez la boutique.',
        });
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: { email: true },
      });
      if (!client?.email) return this.unavailable();
      // Recovery and linking share a single sending budget for this order.
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
        throw new HttpException(
          'Attendez avant de demander un nouveau code.',
          429,
        );
      await tx.commandeGuestChallenge.updateMany({
        where: { commandeId: grant.commandeId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.commandeGuestChallenge.create({
        data: {
          id,
          commandeId: grant.commandeId,
          purpose: 'LINK',
          grantVersion: grant.version,
          orderVersion: grant.commande.version,
          targetClientId: clientId,
          codeHash: this.digest(`LINK:${id}:${code}`),
          expiresAt: new Date(now.getTime() + 600000),
        },
      });
      return {
        email: grant.recoveryEmail,
        reference: grant.commande.numeroSuivi,
        accountEmail: client.email,
      };
    });
    const delivered = await this.mail.sendGuestLinkCode(
      delivery.email,
      code,
      delivery.reference,
      delivery.accountEmail,
    );
    await this.db.commandeGuestChallenge.update({
      where: { id },
      data: delivered ? { delivered: true } : { consumedAt: new Date() },
    });
    if (!delivered)
      return {
        available: false,
        message:
          'Le code n’a pas pu être envoyé. Contactez la boutique ou réessayez plus tard.',
      };
    return {
      challengeId: id,
      message:
        'Un code de rattachement a été envoyé à l’email enregistré lors de la commande. Les autres codes en attente sont remplacés.',
    };
  }

  async link(
    token: string,
    id: string,
    actionKey: string,
    clientId: string,
    code?: string,
  ) {
    const tokenHash = guestTokenHash(token),
      actionHash = guestTokenHash(actionKey);
    if (
      !tokenHash ||
      !actionHash ||
      !clientId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return this.unavailable();
    const proofHash = this.digest(
      `LINK-RECEIPT:${id}:${tokenHash}:${actionHash}:${clientId}`,
    );
    const outcome = await this.db.$transaction(async (tx) => {
      const initial = await tx.commandeGuestChallenge.findUnique({
        where: { id },
      });
      if (
        !initial ||
        initial.purpose !== 'LINK' ||
        initial.targetClientId !== clientId
      )
        return { error: 'invalid' } as const;
      await tx.$queryRaw`SELECT id FROM commande WHERE id = ${initial.commandeId} FOR UPDATE`;
      await tx.$queryRaw`SELECT commande_id FROM commande_guest_access WHERE commande_id = ${initial.commandeId} FOR UPDATE`;
      const challenge = await tx.commandeGuestChallenge.findUnique({
        where: { id },
      });
      const now = new Date();
      if (challenge?.completedAt && challenge.linkResult) {
        // A completed receipt exposes no current order or coordinates. A separate
        // 256-bit action key and the same authenticated account allow exact retry.
        if (
          challenge.completedAt.getTime() + 30 * 86400000 <= now.getTime() ||
          challenge.proofHash !== proofHash
        )
          return { error: 'invalid' } as const;
        return { result: challenge.linkResult } as const;
      }
      const grant = await tx.commandeGuestAccess.findUnique({
        where: { commandeId: initial.commandeId },
        include: { commande: true },
      });
      if (
        !challenge ||
        !grant ||
        !challenge.delivered ||
        challenge.consumedAt ||
        challenge.attempts >= 5 ||
        challenge.expiresAt <= now ||
        grant.tokenHash !== tokenHash ||
        grant.revokedAt ||
        grant.expiresAt <= now ||
        grant.commande.clientId
      )
        return { error: 'invalid' } as const;
      if (!code) return { error: 'code_required' } as const;
      const correct =
        /^\d{8}$/.test(code) &&
        timingSafeEqual(
          Buffer.from(challenge.codeHash, 'hex'),
          Buffer.from(this.digest(`LINK:${id}:${code}`), 'hex'),
        );
      await tx.commandeGuestChallenge.update({
        where: { id },
        data: {
          attempts: { increment: 1 },
          ...(correct || challenge.attempts >= 4 ? { consumedAt: now } : {}),
        },
      });
      if (!correct) return { error: 'invalid' } as const;
      if (
        challenge.grantVersion !== grant.version ||
        challenge.orderVersion !== grant.commande.version
      )
        return { error: 'changed' } as const;
      const changed = await tx.commande.updateMany({
        where: {
          id: grant.commandeId,
          clientId: null,
          version: challenge.orderVersion,
        },
        data: { clientId, version: { increment: 1 } },
      });
      if (changed.count !== 1) return { error: 'changed' } as const;
      const result = {
        commandeId: grant.commandeId,
        numeroSuivi: grant.commande.numeroSuivi,
        linked: true,
      };
      await tx.commandeGuestAccess.update({
        where: { commandeId: grant.commandeId },
        data: {
          revokedAt: now,
          revokedBy: clientId,
          reason: 'Rattachement au compte vérifié par email',
          version: { increment: 1 },
        },
      });
      await tx.commandeGuestChallenge.updateMany({
        where: { commandeId: grant.commandeId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.commandeGuestChallenge.update({
        where: { id },
        data: { proofHash, linkResult: result, completedAt: now },
      });
      return { result } as const;
    });
    if ('result' in outcome) return outcome.result;
    if (outcome.error === 'code_required')
      throw new BadRequestException({
        code: 'GUEST_LINK_CODE_REQUIRED',
        message: 'Saisissez le code de rattachement reçu par email.',
      });
    if (outcome.error === 'changed')
      throw new ConflictException({
        code: 'GUEST_ORDER_CHANGED',
        message:
          'La commande ou l’accès a changé. Actualisez le suivi et demandez un nouveau code.',
      });
    throw new UnauthorizedException({
      code: 'GUEST_LINK_INVALID',
      message:
        'Code ou accès invalide, expiré ou déjà utilisé. Vérifiez le code ou demandez-en un nouveau.',
    });
  }

  private digest(value: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Guest signing secret unavailable');
    return createHmac('sha256', secret).update(value).digest('hex');
  }
  private unavailable(): never {
    throw new UnauthorizedException({
      code: 'GUEST_ACCESS_UNAVAILABLE',
      message: 'Accès indisponible ou expiré. Contactez la boutique.',
    });
  }
}
