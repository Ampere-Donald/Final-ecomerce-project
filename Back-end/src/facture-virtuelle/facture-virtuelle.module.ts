import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { FactureVirtuelleController } from './facture-virtuelle.controller';
import { FactureVirtuelleService } from './facture-virtuelle.service';
import { FactureVirtuelleEventsService } from './facture-virtuelle.events.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FactureVirtuelleController],
  providers: [FactureVirtuelleService, FactureVirtuelleEventsService],
})
export class FactureVirtuelleModule {}
