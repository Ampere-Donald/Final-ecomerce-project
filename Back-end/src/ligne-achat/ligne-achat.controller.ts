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
import { LigneAchatService } from './ligne-achat.service';
import { CreateLigneAchatDto } from './dto/create-ligne-achat.dto';
import { UpdateLigneAchatDto } from './dto/update-ligne-achat.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('lignes-achat')
export class LigneAchatController {
  constructor(private readonly ligneAchatService: LigneAchatService) {}

  @Post()
  create(@Body() createLigneAchatDto: CreateLigneAchatDto) {
    return this.ligneAchatService.create(createLigneAchatDto);
  }

  @Get()
  findAll(@Query('achatId') achatId?: string) {
    if (achatId) {
      return this.ligneAchatService.findByAchat(achatId);
    }
    return this.ligneAchatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ligneAchatService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLigneAchatDto: UpdateLigneAchatDto,
  ) {
    return this.ligneAchatService.update(id, updateLigneAchatDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ligneAchatService.remove(id);
  }
}
