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
import { FournisseurService } from './fournisseur.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('fournisseurs')
export class FournisseurController {
  constructor(private readonly fournisseurService: FournisseurService) {}

  @Post()
  create(@Request() req: any, @Body() createFournisseurDto: CreateFournisseurDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.fournisseurService.create(createFournisseurDto, actor);
  }

  @Get()
  findAll() {
    return this.fournisseurService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fournisseurService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateFournisseurDto: UpdateFournisseurDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.fournisseurService.update(id, updateFournisseurDto, actor);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.fournisseurService.remove(id, actor);
  }
}
