import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { InventaireController } from './inventaire.controller';
import { InventaireService } from './inventaire.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InventaireController],
  providers: [InventaireService],
})
export class InventaireModule {}
