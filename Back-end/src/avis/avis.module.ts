import { Module } from '@nestjs/common';
import { AvisService } from './avis.service';
import { AvisController } from './avis.controller';
@Module({ controllers: [AvisController], providers: [AvisService] })
export class AvisModule {}
