import { Module } from '@nestjs/common';
import { LigneAchatService } from './ligne-achat.service';
import { LigneAchatController } from './ligne-achat.controller';

@Module({
  controllers: [LigneAchatController],
  providers: [LigneAchatService],
  exports: [LigneAchatService],
})
export class LigneAchatModule {}
