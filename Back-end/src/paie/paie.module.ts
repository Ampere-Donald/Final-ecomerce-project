import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PaieController } from './paie.controller';
import { PaieService } from './paie.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PaieController],
  providers: [PaieService],
})
export class PaieModule {}
