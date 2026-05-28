import { Module } from '@nestjs/common';
import { CaisseModule } from '../caisse/caisse.module';
import { CoffreController } from './coffre.controller';
import { CoffreService } from './coffre.service';

@Module({
  imports: [CaisseModule],
  controllers: [CoffreController],
  providers: [CoffreService],
  exports: [CoffreService],
})
export class CoffreModule {}
