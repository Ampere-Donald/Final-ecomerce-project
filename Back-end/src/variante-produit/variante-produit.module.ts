import { Module } from '@nestjs/common';
import { VarianteProduitService } from './variante-produit.service';
import { VarianteProduitController } from './variante-produit.controller';

@Module({
  controllers: [VarianteProduitController],
  providers: [VarianteProduitService],
  exports: [VarianteProduitService],
})
export class VarianteProduitModule {}
