import { Module } from '@nestjs/common';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';

@Module({
  controllers: [VenteController],
  providers: [VenteService],
  exports: [VenteService],
})
export class VenteModule {}
