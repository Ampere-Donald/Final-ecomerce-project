import { Module } from '@nestjs/common';
import { MouvementStockService } from './mouvement-stock.service';
import { MouvementStockController } from './mouvement-stock.controller';

@Module({
  controllers: [MouvementStockController],
  providers: [MouvementStockService],
  exports: [MouvementStockService],
})
export class MouvementStockModule {}
