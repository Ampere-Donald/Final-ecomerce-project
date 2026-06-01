import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { FactureController } from './facture.controller';
import { FactureService } from './facture.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FactureController],
  providers: [FactureService],
})
export class FactureModule {}
