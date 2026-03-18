import { Module } from '@nestjs/common';
import { VarianteProduitAttributService } from './variante-produit-attribut.service';
import { VarianteProduitAttributController } from './variante-produit-attribut.controller';

@Module({
  controllers: [VarianteProduitAttributController],
  providers: [VarianteProduitAttributService],
  exports: [VarianteProduitAttributService],
})
export class VarianteProduitAttributModule {}
