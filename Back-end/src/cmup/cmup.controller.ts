import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CmupService } from './cmup.service';
import { PreviewCmupDto } from './dto/cmup.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@Controller('cmup')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class CmupController {
  constructor(private readonly service: CmupService) {}

  /** Stateless preview — appelé pendant la saisie du formulaire achat (D4). */
  @Post('preview')
  preview(@Body() dto: PreviewCmupDto) {
    return this.service.preview(dto);
  }

  /** Vue valorisation stock : tous les produits avec CMUP, marges, valeur stock. */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Historique des mouvements CMUP pour un produit. */
  @Get('produits/:id/historique')
  historique(@Param('id') id: string) {
    return this.service.historique(id);
  }
}
