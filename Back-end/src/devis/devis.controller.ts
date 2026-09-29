import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { DevisService } from './devis.service';
import {
  CreateDemandeDevisDto,
  RepondreDevisDto,
  ResolveDevisDto,
  ClarifierDevisDto,
} from './dto/devis.dto';

@Controller('devis')
export class DevisController {
  constructor(private readonly service: DevisService) {}

  @Post('resolve')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  resolve(@Body() dto: ResolveDevisDto) {
    return this.service.resolve(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Request() req: any, @Body() dto: CreateDemandeDevisDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Request() req: any) {
    return this.service.findMine(req.user.id);
  }

  @Get('mine/:id')
  @UseGuards(JwtAuthGuard)
  mineOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findMineOne(req.user.id, id);
  }

  @Patch('mine/:id/precision')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  clarify(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClarifierDevisDto,
  ) {
    return this.service.clarify(req.user.id, id, dto);
  }

  @Get('admin')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  adminList(@Request() req: any) {
    return this.service.findForAdmin(req.user);
  }

  @Patch('admin/:id/reponse')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  respond(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepondreDevisDto,
  ) {
    return this.service.respond(req.user, id, dto);
  }
}
