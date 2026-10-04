import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { AvisService } from './avis.service';
import { CreateAvisDto, ModererAvisDto, SignalerAvisDto } from './avis.dto';

@Controller('avis')
export class AvisController {
  constructor(private readonly service: AvisService) {}
  @Get(':id/photo')
  @Header('Cache-Control', 'no-store')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Referrer-Policy', 'no-referrer')
  async publicPhoto(@Param('id', ParseUUIDPipe) id: string) {
    return new StreamableFile(await this.service.publicPhoto(id), {
      type: 'image/webp',
    });
  }
  @Get(':id/photo-privee')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  async privatePhoto(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new StreamableFile(
      await this.service.accountPhoto(req.user.id, id),
      { type: 'image/webp' },
    );
  }
  @Get('admin/:id/photo')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  async adminPhoto(@Param('id', ParseUUIDPipe) id: string) {
    return new StreamableFile(await this.service.adminPhoto(id), {
      type: 'image/webp',
    });
  }
  @Get('produits/:id')
  @Header('Cache-Control', 'no-store')
  publicList(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.publicList(id, page, limit);
  }
  @Get('commandes/:id')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  purchases(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.purchaseLines(req.user.id, id);
  }
  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Header('Cache-Control', 'private, no-store')
  create(@Request() req: any, @Body() dto: CreateAvisDto) {
    return this.service.create(req.user.id, dto);
  }
  @Get('admin')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Header('Cache-Control', 'private, no-store')
  admin(@Query('statut') statut?: string, @Query('page') page?: string) {
    return this.service.adminList(statut, page);
  }
  @Post('admin/:id/moderation')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Header('Cache-Control', 'private, no-store')
  moderate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModererAvisDto,
  ) {
    return this.service.moderate(req.user.id, id, dto);
  }
  @Post(':id/signalement')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'private, no-store')
  report(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignalerAvisDto,
  ) {
    return this.service.report(req.user.id, id, dto);
  }
}
