import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MouvementStockService } from './mouvement-stock.service';
import { CreateMouvementStockDto } from './dto/create-mouvement-stock.dto';
import { UpdateMouvementStockDto } from './dto/update-mouvement-stock.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('mouvements-stock')
export class MouvementStockController {
  constructor(private readonly mouvementStockService: MouvementStockService) {}

  @Post()
  create(@Request() req: any, @Body() createMouvementStockDto: CreateMouvementStockDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.mouvementStockService.create(createMouvementStockDto, actor);
  }

  @Get()
  findAll(@Query('produitId') produitId?: string) {
    if (produitId) {
      return this.mouvementStockService.findByVariante(produitId);
    }
    return this.mouvementStockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mouvementStockService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateMouvementStockDto: UpdateMouvementStockDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.mouvementStockService.update(id, updateMouvementStockDto, actor);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.mouvementStockService.remove(id, actor);
  }
}
