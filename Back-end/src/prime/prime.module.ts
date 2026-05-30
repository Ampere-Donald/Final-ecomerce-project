import { Module } from '@nestjs/common';
import { PrimeController } from './prime.controller';
import { PrimeService } from './prime.service';

@Module({
  controllers: [PrimeController],
  providers: [PrimeService],
})
export class PrimeModule {}
