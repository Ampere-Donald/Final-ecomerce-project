import { Module } from '@nestjs/common';
import { CaisseJourModule } from '../caisse-jour/caisse-jour.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ReglementController } from './reglement.controller';
import { ReglementService } from './reglement.service';

@Module({
  imports: [CaisseJourModule, AdminAuthModule],
  controllers: [ReglementController],
  providers: [ReglementService],
  exports: [ReglementService],
})
export class ReglementModule {}
