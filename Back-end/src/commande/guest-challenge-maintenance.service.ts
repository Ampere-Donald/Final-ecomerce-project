import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

export const GUEST_CODE_RETENTION_MS = 24 * 3600000;
export const GUEST_RECEIPT_RETENTION_MS = 30 * 86400000;
const BATCH_SIZE = 500;

@Injectable()
export class GuestChallengeMaintenanceService {
  private readonly logger = new Logger(GuestChallengeMaintenanceService.name);
  private running = false;
  constructor(private readonly db: DatabaseService) {}

  /** Bounded batches; optional order scope is for isolated recipes, never a public route. */
  async prune(now = new Date(), orderIds?: string[]) {
    if (orderIds && !orderIds.length) return 0;
    const codeCutoff = new Date(now.getTime() - GUEST_CODE_RETENTION_MS);
    const receiptCutoff = new Date(now.getTime() - GUEST_RECEIPT_RETENTION_MS);
    const budgetCutoff = new Date(now.getTime() - 3600000);
    const scope = orderIds
      ? Prisma.sql`AND commande_id IN (${Prisma.join(orderIds)})`
      : Prisma.empty;
    let deleted = 0;
    // At most 2,000 rows per run. Locked rows wait for a subsequent run.
    for (let batch = 0; batch < 4; batch++) {
      const result = await this.db.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        WITH candidates AS (
          SELECT id FROM commande_guest_challenge
          WHERE (
            (completed_at IS NULL AND expires_at < ${codeCutoff} AND created_at < ${codeCutoff})
            OR (completed_at <= ${receiptCutoff} AND created_at < ${budgetCutoff})
          ) ${scope}
          ORDER BY COALESCE(completed_at, expires_at), id
          LIMIT ${BATCH_SIZE} FOR UPDATE SKIP LOCKED
        ), removed AS (
          DELETE FROM commande_guest_challenge c USING candidates
          WHERE c.id = candidates.id RETURNING c.id
        ) SELECT count(*) AS count FROM removed
      `);
      const count = Number(result[0].count);
      deleted += count;
      if (count < BATCH_SIZE) break;
    }
    return deleted;
  }

  @Cron('15 * * * *', { timeZone: 'Africa/Douala' })
  async scheduledPrune() {
    // Activate only after the guest migrations and rollout checks.
    if (process.env.GUEST_CHALLENGE_CLEANUP_ENABLED !== 'true' || this.running)
      return;
    this.running = true;
    try {
      const count = await this.prune();
      if (count) this.logger.log(`Codes invités périmés supprimés : ${count}`);
    } catch {
      // Never log SQL, receipt payloads, hashes or provider/recipient details.
      this.logger.error(
        'Échec du nettoyage des codes invités. Réessai au prochain passage.',
      );
    } finally {
      this.running = false;
    }
  }
}
