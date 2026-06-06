import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/admin-auth/admin-auth.guard';
import { Roles } from 'src/admin-auth/roles.decorator';
import { RolesGuard } from 'src/admin-auth/roles.guard';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { TransformerProformaDto } from './dto/transformer-proforma.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { ProformaService } from './proforma.service';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('proformas')
export class ProformaController {
  constructor(private readonly service: ProformaService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  create(@Request() req: any, @Body() dto: CreateProformaDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  findAll(
    @Request() req: any,
    @Query('statut') statut?: string,
    @Query('periode') periode?: string,
  ) {
    return this.service.findAll(req.user, { statut, periode });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateProformaDto,
  ) {
    return this.service.update(id, req.user, dto);
  }

  @Post(':id/transformer')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  transformer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: TransformerProformaDto,
  ) {
    return this.service.transformer(id, req.user, dto.methodePaiement);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
