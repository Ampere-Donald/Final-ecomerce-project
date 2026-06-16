import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CommandeService } from './commande.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { ProcessPickupDto } from './dto/process-pickup.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@Controller('commandes')
export class CommandeController {
  constructor(private readonly commandeService: CommandeService) {}

  /** Standard order creation (public) */
  @Post()
  create(@Body() createCommandeDto: CreateCommandeDto) {
    return this.commandeService.create(createCommandeDto);
  }

  /** Checkout with inline account creation (public) */
  @Post('checkout')
  checkout(@Body() dto: CreateCommandeDto) {
    return this.commandeService.createWithAccount(dto);
  }

  /** Admin: list all orders */
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  @Get()
  findAll() {
    return this.commandeService.findAll();
  }

  /** Authenticated user's orders */
  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  myOrders(@Request() req: any) {
    return this.commandeService.findByClient(req.user.id);
  }

  /** Admin: process in-store pickup */
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Patch(':id/pickup')
  processPickup(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: ProcessPickupDto,
  ) {
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.commandeService.processPickup(id, dto, actor);
  }

  /** Admin: view single order */
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEUR')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandeService.findOne(id);
  }

  /**
   * Admin status update.
   * ANTI-FRAUD: Admin can ONLY set status to EN_ATTENTE or EN_LIVRAISON.
   */
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateCommandeDto: UpdateCommandeDto,
  ) {
    if (updateCommandeDto.statut && !['EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'LIVREE'].includes(updateCommandeDto.statut)) {
      throw new ForbiddenException(
        'L\'administrateur ne peut définir que les statuts "En attente", "Confirmée", "En livraison" ou "Livrée". L\'annulation est réservée au client.',
      );
    }
    const actor = { id: req.user.id, nom: req.user.nom, role: req.user.role };
    return this.commandeService.update(id, updateCommandeDto, actor);
  }

  /** Client cancels their own order */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const order = await this.commandeService.findOne(id);
    if (order.clientId && order.clientId !== req.user.id) {
      throw new ForbiddenException('Cette commande ne vous appartient pas.');
    }
    return this.commandeService.cancel(id);
  }

  /**
   * Client confirms reception of goods.
   * ONLY the order owner can call this, and only when status is LIVREE.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reception')
  async confirmReception(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandeService.confirmReception(id, req.user.id);
  }
}
