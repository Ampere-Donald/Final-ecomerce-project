import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { FavoriService } from './favori.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('favoris')
@UseGuards(JwtAuthGuard)
export class FavoriController {
  constructor(private readonly favoriService: FavoriService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.favoriService.findAll(req.user.id);
  }

  @Post(':produitId')
  add(@Request() req: any, @Param('produitId', ParseUUIDPipe) produitId: string) {
    return this.favoriService.add(req.user.id, produitId);
  }

  @Delete(':produitId')
  remove(@Request() req: any, @Param('produitId', ParseUUIDPipe) produitId: string) {
    return this.favoriService.remove(req.user.id, produitId);
  }
}
