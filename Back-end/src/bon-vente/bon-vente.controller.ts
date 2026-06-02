import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { AdminAuthGuard } from 'src/admin-auth/admin-auth.guard';
import { Roles } from 'src/admin-auth/roles.decorator';
import { RolesGuard } from 'src/admin-auth/roles.guard';
import { BonVenteEventsService } from './bon-vente.events.service';
import { BonVenteService } from './bon-vente.service';
import { CreateBonDto } from './dto/create-bon.dto';
import { EncaisserTicketDto } from 'src/ticket-vente/dto/encaisser-ticket.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('bons')
export class BonVenteController {
  constructor(
    private readonly bonVenteService: BonVenteService,
    private readonly bonVenteEventsService: BonVenteEventsService,
  ) {}

  @Roles('VENDEUR')
  @Post()
  create(@Request() req: any, @Body() dto: CreateBonDto) {
    return this.bonVenteService.create(dto, req.user);
  }

  @Roles('CAISSIER', 'SUPER_ADMIN', 'ADMIN')
  @Get('pending')
  findPending() {
    return this.bonVenteService.findPending();
  }

  @Roles('VENDEUR')
  @Get('mes-bons')
  mesBons(@Request() req: any) {
    return this.bonVenteService.findMesBons(req.user.id);
  }

  @Roles('CAISSIER', 'SUPER_ADMIN', 'ADMIN')
  @Post(':id/valider')
  valider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EncaisserTicketDto,
    @Request() req: any,
  ) {
    return this.bonVenteService.valider(id, req.user, dto);
  }

  @Roles('VENDEUR')
  @Post(':id/annuler')
  annuler(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.bonVenteService.annuler(id, req.user);
  }

  @Roles('CAISSIER', 'SUPER_ADMIN', 'ADMIN')
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.bonVenteEventsService.stream$.pipe(
      map((bon) => ({ data: bon }) as MessageEvent),
    );
  }
}
