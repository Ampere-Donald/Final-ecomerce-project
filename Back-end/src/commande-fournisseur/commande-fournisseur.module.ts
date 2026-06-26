import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TauxChangeModule } from '../taux-change/taux-change.module';
import { AchatModule } from '../achat/achat.module';
import { CommandeFournisseurController } from './commande-fournisseur.controller';
import { CommandeFournisseurService } from './commande-fournisseur.service';

@Module({
  imports: [DatabaseModule, TauxChangeModule, AchatModule],
  controllers: [CommandeFournisseurController],
  providers: [CommandeFournisseurService],
})
export class CommandeFournisseurModule {}
