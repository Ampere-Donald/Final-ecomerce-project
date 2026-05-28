import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EcheanceService } from './echeance.service';

@Injectable()
export class EcheanceSchedulerService {
  private readonly logger = new Logger(EcheanceSchedulerService.name);

  constructor(private readonly echeanceService: EcheanceService) {}

  /** Runs every day at 07:00 Africa/Douala time. */
  @Cron('0 7 * * *', { timeZone: 'Africa/Douala' })
  async handleDailyAlerts() {
    this.logger.log('Running daily échéance alert job...');
    try {
      await this.echeanceService.processDailyAlerts();
    } catch (error: any) {
      this.logger.error(`Daily échéance alert job failed: ${error?.message}`);
    }
  }
}
