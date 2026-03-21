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
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('commandes')
export class CommandeController {
  constructor(private readonly commandeService: CommandeService) {}

  /** Standard order creation */
  @Post()
  create(@Body() createCommandeDto: CreateCommandeDto) {
    return this.commandeService.create(createCommandeDto);
  }

  /** Checkout with inline account creation */
  @Post('checkout')
  checkout(@Body() dto: CreateCommandeDto) {
    return this.commandeService.createWithAccount(dto);
  }

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

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandeService.findOne(id);
  }

  /**
   * Admin status update.
   * ANTI-FRAUD: Admin can ONLY set status to EN_ATTENTE or EN_LIVRAISON.
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCommandeDto: UpdateCommandeDto,
  ) {
    if (updateCommandeDto.statut && !['EN_ATTENTE', 'EN_LIVRAISON'].includes(updateCommandeDto.statut)) {
      throw new ForbiddenException(
        'L\'administrateur ne peut définir que les statuts "En attente" ou "En livraison". L\'annulation et la confirmation sont réservées au client.',
      );
    }
    return this.commandeService.update(id, updateCommandeDto);
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
