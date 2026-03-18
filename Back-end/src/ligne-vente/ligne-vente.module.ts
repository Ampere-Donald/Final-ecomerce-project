import { Module } from '@nestjs/common';
import { LigneVenteService } from './ligne-vente.service';
import { LigneVenteController } from './ligne-vente.controller';

@Module({
  controllers: [LigneVenteController],
  providers: [LigneVenteService],
  exports: [LigneVenteService],
})
export class LigneVenteModule {}
