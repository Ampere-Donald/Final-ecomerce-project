import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';

@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR')
  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientService.create(createClientDto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR')
  @Get()
  findAll() {
    return this.clientService.findAll();
  }

  /** Registre des crédits (financier) — pas le vendeur. Doit précéder la route :id. */
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get('credits')
  listCredits() {
    return this.clientService.listCredits();
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findOne(id);
  }

  /** Encours synthétique d'un client (financier) — pas le vendeur. */
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get(':id/encours')
  getEncours(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.getEncours(id);
  }

  /** Détail crédit d'un client (financier) — pas le vendeur. */
  @Roles('SUPER_ADMIN', 'ADMIN', 'CAISSIER')
  @Get(':id/credits')
  getCredits(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.getCredits(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientService.update(id, updateClientDto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.remove(id);
  }
}
