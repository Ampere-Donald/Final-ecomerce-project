import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InventaireService } from './inventaire.service';
import { CreateInventaireDto } from './dto/create-inventaire.dto';
import { ComptageDto } from './dto/comptage.dto';
import { CreateDelegationDto } from './dto/delegation.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('inventaires')
export class InventaireController {
  constructor(private readonly service: InventaireService) {}

  private actor(req: any) {
    return { id: req.user.id, nom: req.user.nom, role: req.user.role };
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Request() req: any, @Body() dto: CreateInventaireDto) {
    return this.service.create(dto, this.actor(req));
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // ── Délégations (déclarées AVANT :id pour éviter la collision de route) ──
  @Roles('SUPER_ADMIN')
  @Post('delegations')
  accorder(@Request() req: any, @Body() dto: CreateDelegationDto) {
    return this.service.accorderDelegation(dto, this.actor(req));
  }

  @Roles('SUPER_ADMIN')
  @Get('delegations')
  listDelegations() {
    return this.service.listDelegations();
  }

  @Roles('SUPER_ADMIN')
  @Post('delegations/:id/revoquer')
  revoquer(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.revoquerDelegation(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/comptage')
  comptage(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ComptageDto,
  ) {
    return this.service.comptage(id, dto, this.actor(req));
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/valider')
  valider(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.valider(id, this.actor(req));
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/annuler')
  annuler(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.annuler(id, this.actor(req));
  }
}
