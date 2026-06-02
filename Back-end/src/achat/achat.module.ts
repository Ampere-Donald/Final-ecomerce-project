import { Module } from '@nestjs/common';
import { AchatService } from './achat.service';
import { AchatController } from './achat.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CmupModule } from 'src/cmup/cmup.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [DatabaseModule, CmupModule, NotificationModule],
  controllers: [AchatController],
  providers: [AchatService],
  exports: [AchatService],
})
export class AchatModule {}
