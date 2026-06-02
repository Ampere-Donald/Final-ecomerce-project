import { Module } from '@nestjs/common';
import { TauxChangeController } from './taux-change.controller';
import { TauxChangeService } from './taux-change.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TauxChangeController],
  providers: [TauxChangeService],
  exports: [TauxChangeService],
})
export class TauxChangeModule {}
