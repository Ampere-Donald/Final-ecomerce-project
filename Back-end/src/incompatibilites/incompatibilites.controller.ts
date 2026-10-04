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
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { PrivateFailureInterceptor } from './private-failure.interceptor';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import {
  CreateIncompatibiliteDto,
  DecisionIncompatibiliteDto,
} from './incompatibilites.dto';
import { IncompatibilitesService } from './incompatibilites.service';
const strict = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
@Controller('incompatibilites')
@UseInterceptors(PrivateFailureInterceptor)
export class IncompatibilitesController {
  constructor(private readonly service: IncompatibilitesService) {}
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Get('commandes/:id')
  @UseGuards(JwtAuthGuard)
  purchases(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.purchaseLines(req.user.id, id);
  }
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async create(@Request() req: any, @Body() raw: unknown) {
    const dto = await strict.transform(raw, {
      type: 'body',
      metatype: CreateIncompatibiliteDto,
    });
    return this.service.create(req.user.id, dto);
  }
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Get('admin')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  list(@Query('statut') statut?: string, @Query('page') page?: string) {
    return this.service.adminList(statut, page);
  }
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Post('admin/:id/decision')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async decide(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    const dto = await strict.transform(raw, {
      type: 'body',
      metatype: DecisionIncompatibiliteDto,
    });
    return this.service.decide(req.user.id, id, dto);
  }
}
