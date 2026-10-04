import { Module } from '@nestjs/common';
import { ParcoursController } from './parcours.controller';
import { ParcoursService } from './parcours.service';
@Module({ controllers: [ParcoursController], providers: [ParcoursService] })
export class ParcoursModule {}
