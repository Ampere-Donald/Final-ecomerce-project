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
} from '@nestjs/common';
import { CaisseService } from './caisse.service';
import { CreateCaisseDto } from './dto/create-caisse.dto';
import { UpdateCaisseDto } from './dto/update-caisse.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('caisse')
export class CaisseController {
  constructor(private readonly caisseService: CaisseService) {}

  @Post()
  create(@Body() createCaisseDto: CreateCaisseDto) {
    return this.caisseService.create(createCaisseDto);
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
    @Body() updateCaisseDto: UpdateCaisseDto,
  ) {
    return this.caisseService.update(id, updateCaisseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.caisseService.remove(id);
  }
}
