import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { EquivalenceService } from './equivalence.service';
import { SuggestEquivalenceDto } from './dto/suggest-equivalence.dto';

@Controller('equivalence')
export class EquivalenceController {
  constructor(private readonly equivalenceService: EquivalenceService) {}

  /**
   * Suggère des équivalents fonctionnels.
   * Endpoint PUBLIC : sert le POS (boutique) ET le site e-commerce (comme GET /produits).
   */
  @Post('suggest')
  suggest(@Body() dto: SuggestEquivalenceDto) {
    return this.equivalenceService.suggest(dto);
  }

  /** Compteur d'appels IA (surveillance du quota gratuit) — réservé admin. */
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('stats')
  stats() {
    return this.equivalenceService.stats();
  }
}
