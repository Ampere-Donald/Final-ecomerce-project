import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { EquivalenceModule } from '../equivalence/equivalence.module';
import { ProductPricingController } from './product-pricing.controller';
import { ProductPricingService } from './product-pricing.service';

@Module({
  imports: [EquivalenceModule],
  controllers: [ProduitController, ProductPricingController],
  providers: [ProduitService, ProductPricingService],
  exports: [ProduitService],
})
export class ProduitModule {}
