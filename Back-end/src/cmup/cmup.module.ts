import { Module } from '@nestjs/common';
import { CmupController } from './cmup.controller';
import { CmupService } from './cmup.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CmupController],
  providers: [CmupService],
  exports: [CmupService],
})
export class CmupModule {}
