import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { ReglementService } from './reglement.service';
import { CreateReglementDto } from './dto/create-reglement.dto';
import { AnnulerReglementDto } from './dto/annuler-reglement.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('reglements')
export class ReglementController {
  constructor(private readonly reglementService: ReglementService) {}

  /** Enregistrer un règlement (caissier — caisse du jour requise). */
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Post()
  create(@Request() req: any, @Body() dto: CreateReglementDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.reglementService.create(dto, actor);
  }

  /** Historique des règlements d'une vente. */
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR')
  @Get()
  findByVente(@Query('venteId', ParseUUIDPipe) venteId: string) {
    return this.reglementService.findByVente(venteId);
  }

  /** Annuler un règlement (caissier ou admin) — motif obligatoire, tracé. */
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Delete(':id')
  annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: AnnulerReglementDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.reglementService.annuler(id, dto, actor);
  }
}
