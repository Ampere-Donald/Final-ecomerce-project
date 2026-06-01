import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PrimeController } from './prime.controller';
import { PrimeService } from './prime.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PrimeController],
  providers: [PrimeService],
})
export class PrimeModule {}
