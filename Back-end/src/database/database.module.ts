import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';
import { DocumentNumberService } from './document-number.service';

@Global()
@Module({
  controllers: [DatabaseController],
  providers: [DatabaseService, DocumentNumberService],
  exports: [DatabaseService, DocumentNumberService],
})
export class DatabaseModule {}
