import { Module } from '@nestjs/common';
import { CatalogueRevisionsService } from './catalogue-revisions.service';
import { CatalogueRevisionsController } from './catalogue-revisions.controller';
@Module({
  controllers: [CatalogueRevisionsController],
  providers: [CatalogueRevisionsService],
})
export class CatalogueRevisionsModule {}
