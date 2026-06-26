import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CommandeFournisseurService } from './commande-fournisseur.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('commandes-fournisseur')
export class CommandeFournisseurController {
  constructor(private readonly service: CommandeFournisseurService) {}

  private actor(req: any) {
    return { id: req.user.id, nom: req.user.nom, role: req.user.role };
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateCommandeDto) {
    return this.service.create(dto, this.actor(req));
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // Déclaré AVANT :id pour éviter la collision de route.
  @Get('suggestions')
  suggestions(
    @Query('categorieId') categorieId?: string,
    @Query('codeFamille') codeFamille?: string,
  ) {
    return this.service.suggestions({ categorieId, codeFamille });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCommandeDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/envoyer')
  envoyer(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.envoyer(id);
  }

  @Post(':id/convertir-achat')
  convertir(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.convertirAchat(id, this.actor(req));
  }

  @Post(':id/annuler')
  annuler(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.annuler(id);
  }
}
