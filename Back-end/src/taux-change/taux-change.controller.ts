import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TauxChangeService } from './taux-change.service';
import { GetLatestRateDto, ManualRateDto } from './dto/taux-change.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Devise } from '@prisma/client';

@Controller('taux-change')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
export class TauxChangeController {
  constructor(private readonly service: TauxChangeService) {}

  @Get('latest')
  getLatest(@Query() dto: GetLatestRateDto) {
    return this.service.getLatest(dto.devise);
  }

  @Post('manual')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  saveManual(@Body() dto: ManualRateDto) {
    return this.service.saveManual(dto.devise, dto.tauxVersFcfa, dto.source);
  }

  @Get('history')
  getHistory(@Query('devise') devise: Devise, @Query('limit') limit?: string) {
    return this.service.getHistory(devise, limit ? parseInt(limit, 10) : 50);
  }
}
