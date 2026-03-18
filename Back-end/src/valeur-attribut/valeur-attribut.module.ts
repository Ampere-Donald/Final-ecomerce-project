import { Module } from '@nestjs/common';
import { ValeurAttributService } from './valeur-attribut.service';
import { ValeurAttributController } from './valeur-attribut.controller';

@Module({
  controllers: [ValeurAttributController],
  providers: [ValeurAttributService],
  exports: [ValeurAttributService],
})
export class ValeurAttributModule {}
