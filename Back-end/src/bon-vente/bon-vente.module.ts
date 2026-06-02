import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { TicketVenteModule } from 'src/ticket-vente/ticket-vente.module';
import { BonVenteController } from './bon-vente.controller';
import { BonVenteEventsService } from './bon-vente.events.service';
import { BonVenteService } from './bon-vente.service';

@Module({
  imports: [DatabaseModule, TicketVenteModule],
  controllers: [BonVenteController],
  providers: [BonVenteService, BonVenteEventsService],
})
export class BonVenteModule {}
