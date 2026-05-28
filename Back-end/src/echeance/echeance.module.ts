import { Module } from '@nestjs/common';
import { CaisseModule } from '../caisse/caisse.module';
import { MailService } from '../auth/mail.service';
import { EcheanceController } from './echeance.controller';
import { EcheanceService } from './echeance.service';
import { EcheanceSchedulerService } from './echeance-scheduler.service';

@Module({
  imports: [CaisseModule],
  controllers: [EcheanceController],
  providers: [EcheanceService, EcheanceSchedulerService, MailService],
  exports: [EcheanceService],
})
export class EcheanceModule {}
