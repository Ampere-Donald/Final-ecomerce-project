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
import { ValeurAttributService } from './valeur-attribut.service';
import { CreateValeurAttributDto } from './dto/create-valeur-attribut.dto';
import { UpdateValeurAttributDto } from './dto/update-valeur-attribut.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@Controller('valeurs-attribut')
export class ValeurAttributController {
  constructor(private readonly valeurAttributService: ValeurAttributService) {}

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() createValeurAttributDto: CreateValeurAttributDto) {
    return this.valeurAttributService.create(createValeurAttributDto);
  }

  @Get()
  findAll(@Query('attributId') attributId?: string) {
    if (attributId) {
      return this.valeurAttributService.findByAttribut(attributId);
    }
    return this.valeurAttributService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.valeurAttributService.findOne(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateValeurAttributDto: UpdateValeurAttributDto,
  ) {
    return this.valeurAttributService.update(id, updateValeurAttributDto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.valeurAttributService.remove(id);
  }
}
