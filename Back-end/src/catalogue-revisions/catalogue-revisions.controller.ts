import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import {
  CatalogueBatchDto,
  CatalogueMutationDto,
  SousCategorieDto,
} from './catalogue-revisions.dto';
import { CatalogueRevisionsService } from './catalogue-revisions.service';

@Controller('catalogue-revisions')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'VENDEUR', 'CAISSIER', 'MANAGER')
export class CatalogueRevisionsController {
  constructor(private readonly service: CatalogueRevisionsService) {}
  @Header('Cache-Control', 'no-store') @Get() list(
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(query);
  }
  @Header('Cache-Control', 'no-store') @Get('equipe') equipe() {
    return this.service.equipe();
  }
  @Header('Cache-Control', 'no-store') @Get('produits/:id') detail(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(id);
  }
  @Post('produits/:id/actions') action(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CatalogueMutationDto,
    @Request() req: any,
  ) {
    return this.service.mutate(id, dto, req.user);
  }
  @Roles('ADMIN', 'SUPER_ADMIN') @Post('selection') batch(
    @Body() dto: CatalogueBatchDto,
    @Request() req: any,
  ) {
    return this.service.batch(dto, req.user);
  }
  @Roles('ADMIN', 'SUPER_ADMIN') @Post('sous-categories') createSub(
    @Body() dto: SousCategorieDto,
  ) {
    return this.service.saveSubcategory(null, dto);
  }
  @Roles('ADMIN', 'SUPER_ADMIN') @Patch('sous-categories/:id') updateSub(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SousCategorieDto,
  ) {
    return this.service.saveSubcategory(id, dto);
  }
  @Roles('ADMIN', 'SUPER_ADMIN') @Delete('sous-categories/:id') deleteSub(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteSubcategory(id);
  }
}
