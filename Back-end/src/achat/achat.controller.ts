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
import { AchatService } from './achat.service';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('achats')
export class AchatController {
  constructor(private readonly achatService: AchatService) {}

  @Post()
  create(@Request() req: any, @Body() createAchatDto: CreateAchatDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.create(createAchatDto, actor);
  }

  @Get()
  findAll() {
    return this.achatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.achatService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateAchatDto: UpdateAchatDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.update(id, updateAchatDto, actor);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.achatService.remove(id, actor);
  }
}
