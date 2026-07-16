import {
  Controller,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TypeFacture } from '@prisma/client';
import { AdminAuthGuard } from 'src/admin-auth/admin-auth.guard';
import { Roles } from 'src/admin-auth/roles.decorator';
import { RolesGuard } from 'src/admin-auth/roles.guard';
import { FactureService } from './facture.service';
import { RecordPrintDto } from './dto/record-print.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('factures')
export class FactureController {
  constructor(private readonly factureService: FactureService) {}

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get()
  findAll(
    @Query('type') type?: TypeFacture,
    @Query('vendeurId') vendeurId?: string,
    @Query('periode') periode?: string,
  ) {
    return this.factureService.findAll({ type, vendeurId, periode });
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR')
  @Post('print-events')
  recordPrint(@Body() dto: RecordPrintDto, @Request() req: any) {
    return this.factureService.recordPrint(dto, req.user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('print-events')
  listPrintEvents(
    @Query('documentType') documentType?: string,
    @Query('documentNumber') documentNumber?: string,
  ) {
    return this.factureService.listPrintEvents(documentType, documentNumber);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.factureService.findOne(id);
  }

  @Roles('CAISSIER', 'SUPER_ADMIN', 'ADMIN')
  @Post(':id/print')
  print(@Param('id', ParseUUIDPipe) id: string) {
    return this.factureService.incrementPrintCount(id);
  }
}
