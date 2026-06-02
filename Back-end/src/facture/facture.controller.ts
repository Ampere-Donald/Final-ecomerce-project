import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TypeFacture } from '@prisma/client';
import { AdminAuthGuard } from 'src/admin-auth/admin-auth.guard';
import { Roles } from 'src/admin-auth/roles.decorator';
import { RolesGuard } from 'src/admin-auth/roles.guard';
import { FactureService } from './facture.service';

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
