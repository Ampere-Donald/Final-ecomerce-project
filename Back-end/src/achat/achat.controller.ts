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
import { AchatService } from './achat.service';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { AnnulerAchatDto } from './dto/annuler-achat.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('achats')
export class AchatController {
  constructor(private readonly achatService: AchatService) {}

  /** Crée un BROUILLON — aucun impact stock/CMUP. */
  @Post()
  create(@Request() req: any, @Body() dto: CreateAchatDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.create(dto, actor);
  }

  @Get()
  findAll() {
    return this.achatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.achatService.findOne(id);
  }

  /** Modification d'un BROUILLON uniquement. */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateAchatDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.update(id, dto, actor);
  }

  /** Valide un BROUILLON → impact stock + CMUP. Réservé aux gestionnaires. */
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post(':id/valider')
  valider(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.valider(id, actor);
  }

  /** Annule un BROUILLON. Réservé aux gestionnaires. */
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post(':id/annuler')
  annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: AnnulerAchatDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.annuler(id, dto, actor);
  }

  /** Suppression physique — seulement si BROUILLON. */
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.remove(id, actor);
  }
}
