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
import { FournisseurService } from './fournisseur.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('fournisseurs')
export class FournisseurController {
  constructor(private readonly fournisseurService: FournisseurService) {}

  @Post()
  create(@Body() createFournisseurDto: CreateFournisseurDto) {
    return this.fournisseurService.create(createFournisseurDto);
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
    @Body() updateFournisseurDto: UpdateFournisseurDto,
  ) {
    return this.fournisseurService.update(id, updateFournisseurDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fournisseurService.remove(id);
  }
}
