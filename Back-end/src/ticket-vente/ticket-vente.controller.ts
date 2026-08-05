import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { TicketVenteService } from './ticket-vente.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { EncaisserTicketDto } from './dto/encaisser-ticket.dto';
import { AnnulerTicketDto } from './dto/annuler-ticket.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketVenteController {
  constructor(private readonly service: TicketVenteService) {}

  /** Création d'un ticket par un vendeur (ou ADMIN/SUPER_ADMIN qui agit comme vendeur). */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  create(@Request() req: any, @Body() dto: CreateTicketDto) {
    return this.service.create(req.user.id, dto);
  }

  /** Contrôle vendeur sans créer de ticket, juste avant la confirmation. */
  @Post('verifier-stock')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  checkStock(@Body() dto: CreateTicketDto) {
    return this.service.checkStock(dto.lignes);
  }

  /** File d'attente caissier. */
  @Get('en-attente')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  listEnAttente() {
    return this.service.listEnAttente();
  }

  /** VENDEUR : ses propres tickets. ADMIN/SUPER_ADMIN : tous les tickets avec nom vendeur. */
  @Get('mes-tickets')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  mesTickets(@Request() req: any) {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
    return this.service.listMine(isAdmin ? undefined : req.user.id);
  }

  /** Tickets du jour, tous statuts (ADMIN/SUPER_ADMIN). */
  @Get('jour')
  @Roles('SUPER_ADMIN', 'ADMIN')
  jour() {
    return this.service.listJour();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR')
  one(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  /** Encaisser un ticket (CAISSIER). */
  @Post(':id/encaisser')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  encaisser(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: EncaisserTicketDto,
  ) {
    return this.service.encaisser(id, req.user.id, dto.methodePaiement, {
      clientId: dto.clientId,
      montantPaye: dto.montantPaye,
      montantRecu: dto.montantRecu,
      documentType: dto.documentType,
      referencePaiement: dto.referencePaiement ?? dto.paymentReference,
      dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  /** Annuler un ticket en attente (vendeur propriétaire ou ADMIN/SUPER_ADMIN). */
  @Post(':id/annuler')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: AnnulerTicketDto,
  ) {
    return this.service.annuler(id, req.user.id, dto?.motif);
  }
}
