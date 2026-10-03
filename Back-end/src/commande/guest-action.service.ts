import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../auth/mail.service';
import { guestTokenHash } from './guest-access';
import { cancelOrder, receiveOrder } from './order-transitions';

export type GuestAction = 'CANCEL' | 'RECEIVE';
export function eligibleGuestAction(
  order: { statut: string; modeReception: string },
  action: GuestAction,
) {
  return action === 'CANCEL'
    ? ['EN_ATTENTE', 'CONFIRMEE'].includes(order.statut)
    : action === 'RECEIVE' &&
        order.statut === 'EN_LIVRAISON' &&
        order.modeReception === 'LIVRAISON';
}

@Injectable()
export class GuestActionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
  ) {}

  async request(token: string, action: GuestAction) {
    this.validateAction(action);
    if (!this.mail.guestRecoveryAvailable())
      return {
        available: false,
        message: 'Le service email est indisponible. Contactez la boutique.',
      };
    const tokenHash = guestTokenHash(token);
    if (!tokenHash) return this.unavailable();
    const id = randomUUID(),
      code = randomInt(0, 100000000).toString().padStart(8, '0');
    const delivery = await this.db.$transaction(async (tx) => {
      const initial = await tx.commandeGuestAccess.findUnique({
        where: { tokenHash },
      });
      if (!initial) return this.unavailable();
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
      if (!eligibleGuestAction(grant.commande, action))
        throw new ConflictException({
          code: 'GUEST_ACTION_UNAVAILABLE',
          message:
            'Cette action n’est pas disponible pour le statut et le mode de réception actuels.',
        });
      if (!grant.recoveryEmail)
        throw new BadRequestException({
          code: 'GUEST_EMAIL_MISSING',
          message:
            'Aucun email n’a été enregistré lors de la commande. Contactez la boutique.',
        });
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
          purpose: action,
          grantVersion: grant.version,
          orderVersion: grant.commande.version,
          codeHash: this.digest(`${action}:${id}:${code}`),
          expiresAt: new Date(now.getTime() + 600000),
        },
      });
      return {
        email: grant.recoveryEmail,
        reference: grant.commande.numeroSuivi,
      };
    });
    const delivered = await this.mail.sendGuestActionCode(
      delivery.email,
      code,
      delivery.reference,
      action,
    );
    await this.db.commandeGuestChallenge.update({
      where: { id },
      data: delivered ? { delivered: true } : { consumedAt: new Date() },
    });
    return delivered
      ? {
          challengeId: id,
          message:
            'Un code pour cette action a été envoyé à l’email enregistré lors de la commande. Les autres codes en attente sont remplacés.',
        }
      : {
          available: false,
          message:
            'Le code n’a pas pu être envoyé. Contactez la boutique ou réessayez plus tard.',
        };
  }

  async execute(
    token: string,
    action: GuestAction,
    id: string,
    actionKey: string,
    code?: string,
  ) {
    this.validateAction(action);
    const tokenHash = guestTokenHash(token),
      actionHash = guestTokenHash(actionKey);
    if (
      !tokenHash ||
      !actionHash ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return this.unavailable();
    const proofHash = this.digest(
      `ACTION-RECEIPT:${action}:${id}:${tokenHash}:${actionHash}`,
    );
    const outcome = await this.db.$transaction(async (tx) => {
      const initial = await tx.commandeGuestChallenge.findUnique({
        where: { id },
      });
      if (!initial || initial.purpose !== action || initial.targetClientId)
        return { error: 'invalid' } as const;
      await tx.$queryRaw`SELECT id FROM commande WHERE id = ${initial.commandeId} FOR UPDATE`;
      await tx.$queryRaw`SELECT commande_id FROM commande_guest_access WHERE commande_id = ${initial.commandeId} FOR UPDATE`;
      const challenge = await tx.commandeGuestChallenge.findUnique({
        where: { id },
      });
      const now = new Date();
      if (challenge?.completedAt && challenge.actionResult) {
        if (
          challenge.completedAt.getTime() + 30 * 86400000 <= now.getTime() ||
          challenge.proofHash !== proofHash
        )
          return { error: 'invalid' } as const;
        return { result: challenge.actionResult, fresh: false } as const;
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
          Buffer.from(this.digest(`${action}:${id}:${code}`), 'hex'),
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
        challenge.orderVersion !== grant.commande.version ||
        !eligibleGuestAction(grant.commande, action)
      )
        return { error: 'changed' } as const;
      const expected = { version: grant.commande.version, clientId: null };
      const changed =
        action === 'CANCEL'
          ? await cancelOrder(tx, grant.commandeId, expected)
          : await receiveOrder(tx, grant.commandeId, expected);
      const result = {
        commandeId: changed.id,
        numeroSuivi: changed.numeroSuivi,
        action,
        statut: changed.statut,
      };
      await tx.notification.create({
        data: {
          type: 'COMMANDE_STATUT',
          message:
            action === 'CANCEL'
              ? `Commande ${result.numeroSuivi} annulée par l’invité — stock restitué`
              : `Commande ${result.numeroSuivi} livrée (réception confirmée par l’invité)`,
        },
      });
      await tx.commandeGuestChallenge.updateMany({
        where: { commandeId: grant.commandeId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.commandeGuestChallenge.update({
        where: { id },
        data: { proofHash, actionResult: result, completedAt: now },
      });
      return { result, fresh: true } as const;
    });
    if ('result' in outcome) return outcome.result;
    if (outcome.error === 'code_required')
      throw new BadRequestException({
        code: 'GUEST_ACTION_CODE_REQUIRED',
        message: 'Saisissez le code reçu par email pour cette action.',
      });
    if (outcome.error === 'changed')
      throw new ConflictException({
        code: 'GUEST_ORDER_CHANGED',
        message:
          'La commande ou l’accès a changé. Actualisez le suivi et demandez un nouveau code.',
      });
    throw new UnauthorizedException({
      code: 'GUEST_ACTION_INVALID',
      message:
        'Code ou accès invalide, expiré ou déjà utilisé. Vérifiez le code ou demandez-en un nouveau.',
    });
  }

  private validateAction(action: GuestAction) {
    if (!['CANCEL', 'RECEIVE'].includes(action))
      throw new BadRequestException('Action invitée invalide.');
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
