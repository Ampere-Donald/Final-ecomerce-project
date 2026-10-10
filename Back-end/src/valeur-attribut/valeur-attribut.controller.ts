import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ValeurAttributService } from './valeur-attribut.service';
import { CreateValeurAttributDto } from './dto/create-valeur-attribut.dto';
import { UpdateValeurAttributDto } from './dto/update-valeur-attribut.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { DocumentationValeurService } from './documentation-valeur.service';
import {
  DocumentationValeurDto,
  RelireDocumentationDto,
} from './dto/documentation-valeur.dto';

@Controller('valeurs-attribut')
export class ValeurAttributController {
  constructor(
    private readonly valeurAttributService: ValeurAttributService,
    private readonly documentation: DocumentationValeurService,
  ) {}

  @Get(':id/documentation')
  readDocumentation(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentation.read(id);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id/documentation-admin')
  readDocumentationAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentation.read(id, true);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/documentation')
  editDocumentation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: DocumentationValeurDto,
    @Req() req: any,
  ) {
    return this.documentation.write(id, input, req.user.id);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/documentation/relire')
  reviewDocumentation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RelireDocumentationDto,
    @Req() req: any,
  ) {
    return this.documentation.write(id, input, req.user.id, true);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() createValeurAttributDto: CreateValeurAttributDto) {
    return this.valeurAttributService.create(createValeurAttributDto);
  }

  @Get()
  findAll(@Query('attributId') attributId?: string) {
    if (attributId) {
      return this.valeurAttributService.findByAttribut(attributId);
    }
    return this.valeurAttributService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.valeurAttributService.findOne(id);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateValeurAttributDto: UpdateValeurAttributDto,
  ) {
    return this.valeurAttributService.update(id, updateValeurAttributDto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.valeurAttributService.remove(id);
  }
}
