import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { EcheanceService } from './echeance.service';
import { CreateEcheanceDto } from './dto/create-echeance.dto';
import { UpdateEcheanceDto } from './dto/update-echeance.dto';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('echeances')
export class EcheanceController {
  constructor(private readonly echeanceService: EcheanceService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Request() req: any, @Body() dto: CreateEcheanceDto) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.echeanceService.create(dto, actor);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  findAll() {
    return this.echeanceService.findAll();
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('a-venir')
  findAVenir(@Query('jours') jours?: string) {
    const parsed = jours ? parseInt(jours, 10) : 30;
    return this.echeanceService.findAVenir(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 30,
    );
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.echeanceService.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateEcheanceDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.echeanceService.update(id, dto, actor);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.echeanceService.remove(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/declencher')
  declencher(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.echeanceService.declencher(id, actor);
  }
}
