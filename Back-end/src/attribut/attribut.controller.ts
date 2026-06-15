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
import { AttributService } from './attribut.service';
import { CreateAttributDto } from './dto/create-attribut.dto';
import { UpdateAttributDto } from './dto/update-attribut.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@Controller('attributs')
export class AttributController {
  constructor(private readonly attributService: AttributService) {}

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() createAttributDto: CreateAttributDto) {
    return this.attributService.create(createAttributDto);
  }

  @Get()
  findAll(@Query('produitId') produitId?: string) {
    if (produitId) {
      return this.attributService.findByProduit(produitId);
    }
    return this.attributService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.attributService.findOne(id);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttributDto: UpdateAttributDto,
  ) {
    return this.attributService.update(id, updateAttributDto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.attributService.remove(id);
  }
}
