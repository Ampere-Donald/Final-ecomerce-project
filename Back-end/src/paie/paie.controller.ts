import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/admin-auth/admin-auth.guard';
import { Roles } from 'src/admin-auth/roles.decorator';
import { RolesGuard } from 'src/admin-auth/roles.guard';
import { PaieService } from './paie.service';
import { CreateSalarieDto } from './dto/create-salarie.dto';
import { UpdateSalarieDto } from './dto/update-salarie.dto';
import { UpdateParametrePaieDto } from './dto/update-parametre-paie.dto';
import {
  CreateBulletinDto,
  PreviewBulletinDto,
} from './dto/create-bulletin.dto';
import { PayerBulletinDto, UpdateBulletinDto } from './dto/update-bulletin.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('paie')
export class PaieController {
  constructor(private readonly paie: PaieService) {}

  // ── Paramètres employeur ───────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('parametres')
  getParametres() {
    return this.paie.getParametres();
  }

  @Roles('SUPER_ADMIN')
  @Put('parametres')
  updateParametres(@Body() dto: UpdateParametrePaieDto) {
    return this.paie.updateParametres(dto);
  }

  // ── Salariés ───────────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('salaries')
  listSalaries() {
    return this.paie.listSalaries();
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('salaries')
  createSalarie(@Body() dto: CreateSalarieDto) {
    return this.paie.createSalarie(dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('salaries/:id')
  getSalarie(@Param('id', ParseUUIDPipe) id: string) {
    return this.paie.getSalarie(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('salaries/:id')
  updateSalarie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalarieDto,
  ) {
    return this.paie.updateSalarie(id, dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('salaries/:id/toggle-actif')
  toggleSalarieActif(@Param('id', ParseUUIDPipe) id: string) {
    return this.paie.toggleSalarieActif(id);
  }

  // ── Bulletins ──────────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('bulletins')
  listBulletins(
    @Query('periode') periode?: string,
    @Query('salarieId') salarieId?: string,
    @Query('statut') statut?: string,
  ) {
    return this.paie.listBulletins({ periode, salarieId, statut });
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('bulletins/preview')
  previewBulletin(@Body() dto: PreviewBulletinDto) {
    return this.paie.previewBulletin(dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('bulletins')
  createBulletin(@Body() dto: CreateBulletinDto, @Request() req: any) {
    return this.paie.createBulletin(dto, req.user?.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('bulletins/:id')
  getBulletin(@Param('id', ParseUUIDPipe) id: string) {
    return this.paie.getBulletin(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('bulletins/:id')
  updateBulletin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBulletinDto,
  ) {
    return this.paie.updateBulletin(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Post('bulletins/:id/valider')
  validerBulletin(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.paie.validerBulletin(id, req.user?.id);
  }

  @Roles('SUPER_ADMIN')
  @Post('bulletins/:id/payer')
  payerBulletin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayerBulletinDto,
  ) {
    return this.paie.payerBulletin(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Post('bulletins/:id/annuler')
  annulerBulletin(@Param('id', ParseUUIDPipe) id: string) {
    return this.paie.annulerBulletin(id);
  }

  @Roles('SUPER_ADMIN')
  @Delete('bulletins/:id')
  removeBulletin(@Param('id', ParseUUIDPipe) id: string) {
    return this.paie.removeBulletin(id);
  }
}
