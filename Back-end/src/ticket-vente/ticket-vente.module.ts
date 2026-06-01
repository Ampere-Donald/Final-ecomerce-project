import { Module } from '@nestjs/common';
import { CaisseJourModule } from '../caisse-jour/caisse-jour.module';
import { TicketVenteService } from './ticket-vente.service';
import { TicketVenteController } from './ticket-vente.controller';
import { TicketVenteSchedulerService } from './ticket-vente-scheduler.service';

@Module({
  imports: [CaisseJourModule],
  controllers: [TicketVenteController],
  providers: [TicketVenteService, TicketVenteSchedulerService],
  exports: [TicketVenteService],
})
export class TicketVenteModule {}
