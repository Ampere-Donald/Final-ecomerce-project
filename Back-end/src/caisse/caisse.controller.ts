import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CaisseService } from './caisse.service';
import { CreateCaisseDto } from './dto/create-caisse.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { TransfertDto } from '../coffre/dto/transfert.dto';
import { AnnulerCaisseDto } from './dto/annuler-caisse.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('caisse')
export class CaisseController {
  constructor(private readonly caisseService: CaisseService) {}

  @Post()
  create(@Request() req: any, @Body() createCaisseDto: CreateCaisseDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.caisseService.create(createCaisseDto, actor);
  }

  @Get()
  findAll() {
    return this.caisseService.findAll();
  }

  @Get('solde')
  getSolde() {
    return this.caisseService.getSolde();
  }

  @Get('solde-global')
  getSoldeGlobal() {
    return this.caisseService.getSoldeGlobal();
  }

  @Post('transferer')
  transferer(@Request() req: any, @Body() transfertDto: TransfertDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.caisseService.transferer(transfertDto, actor);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/annuler')
  annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: AnnulerCaisseDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.caisseService.annuler(id, dto.motifAnnulation, actor);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.caisseService.findOne(id);
  }
}
