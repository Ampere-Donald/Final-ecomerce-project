import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { AdminAuthGuard } from 'src/admin-auth/admin-auth.guard';
import { Roles } from 'src/admin-auth/roles.decorator';
import { RolesGuard } from 'src/admin-auth/roles.guard';
import { FactureVirtuelleService } from './facture-virtuelle.service';
import { FactureVirtuelleEventsService } from './facture-virtuelle.events.service';
import { CreateFactureVirtuelleDto } from './dto/create-facture-virtuelle.dto';
import { RefuserFactureVirtuelleDto } from './dto/refuser-facture-virtuelle.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('facture-virtuelle')
export class FactureVirtuelleController {
  constructor(
    private readonly factureVirtuelleService: FactureVirtuelleService,
    private readonly eventsService: FactureVirtuelleEventsService,
  ) {}

  @Roles('VENDEUR', 'CAISSIER', 'ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Request() req: any, @Body() dto: CreateFactureVirtuelleDto) {
    return this.factureVirtuelleService.create(dto, req.user);
  }

  @Roles('VENDEUR', 'CAISSIER', 'ADMIN', 'SUPER_ADMIN')
  @Get()
  findAll(
    @Request() req: any,
    @Query('statut') statut?: string,
    @Query('vendeurId') vendeurId?: string,
  ) {
    return this.factureVirtuelleService.findAll(
      { statut, vendeurId },
      req.user.role,
      req.user.id,
    );
  }

  @Roles('SUPER_ADMIN')
  @Sse('pending')
  pending(): Observable<MessageEvent> {
    return this.eventsService.stream$.pipe(
      map((fv) => ({ data: fv }) as MessageEvent),
    );
  }

  @Roles('VENDEUR', 'CAISSIER', 'ADMIN', 'SUPER_ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.factureVirtuelleService.findOne(id);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/approuver')
  approuver(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.factureVirtuelleService.approuver(id, req.user);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/refuser')
  refuser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefuserFactureVirtuelleDto,
    @Request() req: any,
  ) {
    return this.factureVirtuelleService.refuser(id, dto.motif, req.user);
  }

  @Roles('VENDEUR', 'CAISSIER', 'ADMIN', 'SUPER_ADMIN')
  @Post(':id/print')
  print(@Param('id', ParseUUIDPipe) id: string) {
    return this.factureVirtuelleService.incrementPrintCount(id);
  }

  @Roles('VENDEUR', 'CAISSIER', 'ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.factureVirtuelleService.remove(id, req.user);
  }
}
