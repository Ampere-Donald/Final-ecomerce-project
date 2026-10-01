import { Module } from '@nestjs/common';
import { ProjetController } from './projet.controller';
import { ProjetService } from './projet.service';
@Module({ controllers: [ProjetController], providers: [ProjetService] })
export class ProjetModule {}
