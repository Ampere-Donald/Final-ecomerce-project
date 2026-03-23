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
} from '@nestjs/common';
import { MouvementStockService } from './mouvement-stock.service';
import { CreateMouvementStockDto } from './dto/create-mouvement-stock.dto';
import { UpdateMouvementStockDto } from './dto/update-mouvement-stock.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('mouvements-stock')
export class MouvementStockController {
  constructor(private readonly mouvementStockService: MouvementStockService) {}

  @Post()
  create(@Body() createMouvementStockDto: CreateMouvementStockDto) {
    return this.mouvementStockService.create(createMouvementStockDto);
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
    @Body() updateMouvementStockDto: UpdateMouvementStockDto,
  ) {
    return this.mouvementStockService.update(id, updateMouvementStockDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mouvementStockService.remove(id);
  }
}
