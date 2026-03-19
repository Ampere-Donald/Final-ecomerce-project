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

  @Post()
  create(@Body() createCommandeDto: CreateCommandeDto) {
    return this.commandeService.create(createCommandeDto);
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

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCommandeDto: UpdateCommandeDto,
  ) {
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
}
