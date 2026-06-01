import {
  Body,
  Controller,
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
import { CaisseJourService } from './caisse-jour.service';
import { FermerCaisseDto } from './dto/fermer-caisse.dto';
import { CreateOperationDto } from './dto/create-operation.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('caisse-jour')
export class CaisseJourController {
  constructor(private readonly service: CaisseJourService) {}

  /**
   * Caisse du jour active (auto-créée si absente).
   * Accessible CAISSIER (sa caisse) + ADMIN/SUPER_ADMIN (supervision temps réel).
   */
  @Get('aujourdhui')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  aujourdhui(@Request() req: any) {
    const caissierId = req.user?.role === 'CAISSIER' ? req.user.id : undefined;
    return this.service.aujourdhui(caissierId);
  }

  /** Historique des caisses du jour (90 derniers). */
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  historique(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.historique(from, to);
  }

  /** Détail d'une caisse du jour : caisse + opérations + solde. */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  one(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOperations(id);
  }

  /**
   * Ferme la caisse du jour active et transfère le solde vers caisse globale.
   * Réservé au caissier en poste, à l'ADMIN ou au SUPER_ADMIN.
   */
  @Post(':id/fermer')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  fermer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: FermerCaisseDto,
  ) {
    return this.service.fermer(id, req.user.id, dto?.note);
  }

  /**
   * Enregistre une opération (ENTREE ou SORTIE) sur la caisse du jour.
   * Caissier pour les sorties tracées, ADMIN/SUPER_ADMIN pour supervision.
   */
  @Post(':id/operation')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  addOperation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: CreateOperationDto,
  ) {
    return this.service.addOperation(
      id,
      dto.typeOperation,
      dto.montant,
      dto.motif,
      req.user.id,
    );
  }
}
