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
import { guestTokenHash } from '../commande/guest-access';
import { CreateAvisDto } from './avis.dto';
import { preparePhoto } from './avis-photo';
import {
  avisContent,
  avisFingerprint,
  AvisService,
  privateAvisSelect,
} from './avis.service';

@Injectable()
export class GuestAvisService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly reviews: AvisService,
  ) {}
  async purchases(token: string) {
    const hash = guestTokenHash(token);
    if (!hash) return this.unavailable();
    const grant = await this.db.commandeGuestAccess.findFirst({
      where: {
        tokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        commande: { clientId: null },
      },
      select: {
        recoveryEmail: true,
        commande: {
          select: {
            id: true,
            statut: true,
            dateLivraison: true,
            lignes: {
              select: {
                id: true,
                produitId: true,
                nomProduit: true,
                avis: { select: privateAvisSelect },
              },
            },
          },
        },
      },
    });
    if (!grant) return this.unavailable();
    return {
      commandeId: grant.commande.id,
      eligible:
        grant.commande.statut === 'LIVREE' && !!grant.commande.dateLivraison,
      codeAvailable:
        !!grant.recoveryEmail && this.mail.guestRecoveryAvailable(),
      lignes: grant.commande.lignes,
    };
  }
  async request(token: string, dto: CreateAvisDto) {
    const contentHash = this.contentHash(dto);
    if (!this.mail.guestRecoveryAvailable())
      return {
        available: false,
        message:
          'L’envoi du code email est indisponible. Contactez la boutique.',
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
      if (grant.commande.statut !== 'LIVREE' || !grant.commande.dateLivraison)
        throw new ConflictException(
          'Un avis est possible après réception de la commande.',
        );
      const line = await tx.ligneCommande.findFirst({
        where: { id: dto.ligneCommandeId, commandeId: grant.commandeId },
        select: { nomProduit: true, avis: { select: { id: true } } },
      });
      if (!line) return this.unavailable();
      if (line.avis)
        throw new ConflictException(
          'Un avis est déjà enregistré pour cet article acheté.',
        );
      if (!grant.recoveryEmail)
        throw new BadRequestException(
          'Aucun email enregistré pour cette commande. Contactez la boutique.',
        );
      const existing = await tx.commandeGuestChallenge.findFirst({
        where: {
          commandeId: grant.commandeId,
          purpose: 'REVIEW',
          reviewLineId: dto.ligneCommandeId,
          reviewContentHash: contentHash,
          grantVersion: grant.version,
          orderVersion: grant.commande.version,
          delivered: true,
          consumedAt: null,
          attempts: { lt: 5 },
          expiresAt: { gt: now },
        },
        select: { id: true },
      });
      if (existing) return { existingId: existing.id };
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
      // Decode only after access, purchase and sending budget checks. No file is
      // persisted or code sent if the image is invalid.
      await preparePhoto(dto.photo);
      await tx.commandeGuestChallenge.updateMany({
        where: { commandeId: grant.commandeId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.commandeGuestChallenge.create({
        data: {
          id,
          commandeId: grant.commandeId,
          purpose: 'REVIEW',
          grantVersion: grant.version,
          orderVersion: grant.commande.version,
          reviewLineId: dto.ligneCommandeId,
          reviewContentHash: contentHash,
          codeHash: this.digest(`REVIEW:${id}:${code}`),
          expiresAt: new Date(now.getTime() + 600000),
        },
      });
      return {
        email: grant.recoveryEmail,
        reference: grant.commande.numeroSuivi,
        product: line.nomProduit,
      };
    });
    if ('existingId' in delivery)
      return {
        challengeId: delivery.existingId,
        message:
          'Reprenez le code déjà envoyé pour cet avis. Aucun nouvel email envoyé.',
      };
    let delivered = false;
    try {
      delivered = await this.mail.sendGuestReviewCode(
        delivery.email,
        code,
        delivery.reference,
        delivery.product,
      );
    } catch {
      /* no transport details in logs */
    }
    await this.db.commandeGuestChallenge.update({
      where: { id },
      data: delivered ? { delivered: true } : { consumedAt: new Date() },
    });
    return delivered
      ? {
          challengeId: id,
          message:
            'Un code autorisant cet avis a été envoyé à l’email de la commande. Les autres codes en attente sont remplacés.',
        }
      : {
          available: false,
          message:
            'Le code n’a pas pu être envoyé. Réessayez plus tard ou contactez la boutique.',
        };
  }
  async execute(
    token: string,
    id: string,
    actionKey: string,
    dto: CreateAvisDto,
    code?: string,
  ) {
    const tokenHash = guestTokenHash(token),
      actionHash = guestTokenHash(actionKey),
      contentHash = this.contentHash(dto);
    if (
      !tokenHash ||
      !actionHash ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return this.unavailable();
    const proofHash = this.digest(
      `REVIEW-RECEIPT:${id}:${tokenHash}:${actionHash}:${contentHash}`,
    );
    const outcome = await this.db.$transaction(async (tx) => {
      const initial = await tx.commandeGuestChallenge.findUnique({
        where: { id },
      });
      if (
        !initial ||
        initial.purpose !== 'REVIEW' ||
        initial.reviewLineId !== dto.ligneCommandeId ||
        initial.reviewContentHash !== contentHash
      )
        return { error: 'invalid' } as const;
      await tx.$queryRaw`SELECT id FROM commande WHERE id = ${initial.commandeId} FOR UPDATE`;
      await tx.$queryRaw`SELECT commande_id FROM commande_guest_access WHERE commande_id = ${initial.commandeId} FOR UPDATE`;
      const challenge = await tx.commandeGuestChallenge.findUnique({
          where: { id },
        }),
        now = new Date();
      if (challenge?.completedAt && challenge.actionResult) {
        if (
          challenge.completedAt.getTime() + 30 * 86400000 <= now.getTime() ||
          challenge.proofHash !== proofHash
        )
          return { error: 'invalid' } as const;
        return { result: challenge.actionResult } as const;
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
          Buffer.from(this.digest(`REVIEW:${id}:${code}`), 'hex'),
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
        grant.commande.statut !== 'LIVREE' ||
        !grant.commande.dateLivraison
      )
        return { error: 'changed' } as const;
      if (
        !(await tx.ligneCommande.findFirst({
          where: { id: dto.ligneCommandeId, commandeId: grant.commandeId },
          select: { id: true },
        }))
      )
        return { error: 'changed' } as const;
      const result = await this.reviews.storeVerified(
        tx,
        dto,
        avisFingerprint({
          guest: tokenHash,
          ligneCommandeId: dto.ligneCommandeId,
          ...avisContent(dto),
        }),
      );
      await tx.commandeGuestChallenge.update({
        where: { id },
        data: { proofHash, actionResult: result, completedAt: now },
      });
      return { result } as const;
    });
    if ('result' in outcome) return outcome.result;
    if (outcome.error === 'code_required')
      throw new BadRequestException({
        code: 'GUEST_REVIEW_CODE_REQUIRED',
        message: 'Saisissez le code autorisant cet avis.',
      });
    if (outcome.error === 'changed')
      throw new ConflictException({
        code: 'GUEST_ORDER_CHANGED',
        message: 'La commande ou l’accès a changé. Actualisez le suivi.',
      });
    throw new UnauthorizedException({
      code: 'GUEST_REVIEW_INVALID',
      message: 'Code, contenu ou accès invalide, expiré ou déjà utilisé.',
    });
  }
  private contentHash(dto: CreateAvisDto) {
    return avisFingerprint({
      requestId: dto.requestId,
      ligneCommandeId: dto.ligneCommandeId,
      ...avisContent(dto),
    });
  }
  async photo(token: string, id: string) {
    const hash = guestTokenHash(token);
    if (!hash) return this.unavailable();
    return this.reviews.photo({
      id,
      ligne: {
        commande: {
          clientId: null,
          guestAccess: {
            is: {
              tokenHash: hash,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
          },
        },
      },
    });
  }
  private digest(value: string) {
    if (!process.env.JWT_SECRET)
      throw new Error('Guest signing secret unavailable');
    return createHmac('sha256', process.env.JWT_SECRET)
      .update(value)
      .digest('hex');
  }
  private unavailable(): never {
    throw new UnauthorizedException({
      code: 'GUEST_ACCESS_UNAVAILABLE',
      message: 'Accès indisponible ou expiré. Contactez la boutique.',
    });
  }
}
