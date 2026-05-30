import { Module } from '@nestjs/common';
import { FactureController } from './facture.controller';
import { FactureService } from './facture.service';

@Module({
  controllers: [FactureController],
  providers: [FactureService],
})
export class FactureModule {}
