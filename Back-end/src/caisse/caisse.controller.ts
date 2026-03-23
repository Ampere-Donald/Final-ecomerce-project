import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CaisseService } from './caisse.service';
import { CreateCaisseDto } from './dto/create-caisse.dto';
import { UpdateCaisseDto } from './dto/update-caisse.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

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

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.caisseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateCaisseDto: UpdateCaisseDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.caisseService.update(id, updateCaisseDto, actor);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.caisseService.remove(id, actor);
  }
}
