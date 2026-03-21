import { Module } from '@nestjs/common';
import { FournisseurService } from './fournisseur.service';
import { FournisseurController } from './fournisseur.controller';

@Module({
  controllers: [FournisseurController],
  providers: [FournisseurService],
  exports: [FournisseurService],
})
export class FournisseurModule {}
