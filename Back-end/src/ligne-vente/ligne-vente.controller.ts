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
import { LigneVenteService } from './ligne-vente.service';
import { CreateLigneVenteDto } from './dto/create-ligne-vente.dto';
import { UpdateLigneVenteDto } from './dto/update-ligne-vente.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('lignes-vente')
export class LigneVenteController {
  constructor(private readonly ligneVenteService: LigneVenteService) {}

  @Post()
  create(@Body() createLigneVenteDto: CreateLigneVenteDto) {
    return this.ligneVenteService.create(createLigneVenteDto);
  }

  @Get()
  findAll(@Query('venteId') venteId?: string) {
    if (venteId) {
      return this.ligneVenteService.findByVente(venteId);
    }
    return this.ligneVenteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ligneVenteService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLigneVenteDto: UpdateLigneVenteDto,
  ) {
    return this.ligneVenteService.update(id, updateLigneVenteDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ligneVenteService.remove(id);
  }
}
