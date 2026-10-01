import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { ProjetService } from './projet.service';
import {
  CreateProjetDto,
  UpdateProjetDto,
  PublierProjetDto,
  RetirerProjetDto,
} from './dto/projet.dto';

@Controller('projets')
export class ProjetController {
  constructor(private readonly service: ProjetService) {}
  @Get() list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPublic(page, limit);
  }
  @Get('public/:slug') detail(@Param('slug') slug: string) {
    return this.service.findPublicOne(slug);
  }
  @Get('admin')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  admin(@Request() req: any) {
    return this.service.findAdmin(req.user);
  }
  @Get('admin/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findAdminOne(req.user, id);
  }
  @Post('admin')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  create(@Request() req: any, @Body() dto: CreateProjetDto) {
    return this.service.create(req.user, dto);
  }
  @Patch('admin/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjetDto,
  ) {
    return this.service.update(req.user, id, dto);
  }
  @Post('admin/:id/publication')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  publish(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublierProjetDto,
  ) {
    return this.service.publish(req.user, id, dto);
  }
  @Post('admin/:id/retrait')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  withdraw(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetirerProjetDto,
  ) {
    return this.service.withdraw(req.user, id, dto);
  }
}
