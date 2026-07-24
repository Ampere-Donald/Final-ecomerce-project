import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { CoffreService } from './coffre.service';
import { CreateCoffreDto } from './dto/create-coffre.dto';
import { SortieCoffreDto } from './dto/sortie-coffre.dto';
import { UpdateCoffreDto } from './dto/update-coffre.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('coffres')
export class CoffreController {
  constructor(private readonly coffreService: CoffreService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Request() req: any, @Body() dto: CreateCoffreDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.coffreService.create(dto, actor);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get()
  findAll() {
    return this.coffreService.findAll();
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coffreService.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateCoffreDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.coffreService.update(id, dto, actor);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/sortie')
  sortie(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: SortieCoffreDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.coffreService.sortie(id, dto, actor);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/cloturer')
  cloturer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: { force?: boolean },
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.coffreService.cloturer(id, Boolean(dto?.force), actor);
  }
}
