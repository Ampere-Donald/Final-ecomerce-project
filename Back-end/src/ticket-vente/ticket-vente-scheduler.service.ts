import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TicketVenteService } from './ticket-vente.service';

@Injectable()
export class TicketVenteSchedulerService {
  private readonly logger = new Logger(TicketVenteSchedulerService.name);

  constructor(private readonly service: TicketVenteService) {}

  /** Chaque minute : marque comme EXPIRE les tickets dépassés (validité 15 min). */
  @Cron(CronExpression.EVERY_MINUTE)
  async expirerTickets() {
    try {
      await this.service.expirerTicketsEchus();
    } catch (e: any) {
      this.logger.error(`Échec expiration tickets : ${e?.message}`);
    }
  }
}
