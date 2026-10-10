import { Module } from '@nestjs/common';
import { ValeurAttributService } from './valeur-attribut.service';
import { ValeurAttributController } from './valeur-attribut.controller';
import { DocumentationValeurService } from './documentation-valeur.service';

@Module({
  controllers: [ValeurAttributController],
  providers: [ValeurAttributService, DocumentationValeurService],
  exports: [ValeurAttributService],
})
export class ValeurAttributModule {}
