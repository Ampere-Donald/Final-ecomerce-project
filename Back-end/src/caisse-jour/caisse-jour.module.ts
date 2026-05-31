import { Module } from '@nestjs/common';
import { CaisseJourService } from './caisse-jour.service';
import { CaisseJourController } from './caisse-jour.controller';
import { CaisseJourSchedulerService } from './caisse-jour-scheduler.service';
import { MailService } from '../auth/mail.service';

@Module({
  controllers: [CaisseJourController],
  providers: [CaisseJourService, CaisseJourSchedulerService, MailService],
  exports: [CaisseJourService],
})
export class CaisseJourModule {}
