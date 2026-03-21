import { Module } from '@nestjs/common';
import { AttributService } from './attribut.service';
import { AttributController } from './attribut.controller';

@Module({
  controllers: [AttributController],
  providers: [AttributService],
  exports: [AttributService],
})
export class AttributModule {}
