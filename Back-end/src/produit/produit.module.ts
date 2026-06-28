import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { EquivalenceModule } from '../equivalence/equivalence.module';

@Module({
  imports: [EquivalenceModule],
  controllers: [ProduitController],
  providers: [ProduitService],
  exports: [ProduitService],
})
export class ProduitModule {}
