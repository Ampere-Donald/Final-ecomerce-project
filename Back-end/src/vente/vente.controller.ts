import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VenteService } from './vente.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { CancelVenteDto } from './dto/cancel-vente.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('ventes')
export class VenteController {
  constructor(private readonly venteService: VenteService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Request() req: any, @Body() createVenteDto: CreateVenteDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.venteService.create(createVenteDto, actor);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get()
  findAll() {
    return this.venteService.findAll();
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.venteService.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateVenteDto: UpdateVenteDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.venteService.update(id, updateVenteDto, actor);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: CancelVenteDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.venteService.remove(id, actor, dto.motif);
  }
}
