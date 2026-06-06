import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/admin-auth/admin-auth.guard';
import { Roles } from 'src/admin-auth/roles.decorator';
import { RolesGuard } from 'src/admin-auth/roles.guard';
import { PrimeService } from './prime.service';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('primes')
export class PrimeController {
  constructor(private readonly primeService: PrimeService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('classement')
  classement(@Query('periode') periode: string) {
    return this.primeService.classement(periode);
  }

  @Roles('VENDEUR')
  @Get('mon-score')
  monScore(@Request() req: any) {
    return this.primeService.monScore(req.user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('vendeur/:id')
  detailVendeur(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('periode') periode: string,
  ) {
    return this.primeService.detailVendeur(id, periode);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id/valider')
  valider(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.primeService.valider(id, req.user.id);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id/payer')
  payer(@Param('id', ParseUUIDPipe) id: string) {
    return this.primeService.payer(id);
  }
}
