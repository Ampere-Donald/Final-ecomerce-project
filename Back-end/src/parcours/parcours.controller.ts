import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { ParcoursBatchDto } from './parcours.dto';
import { ParcoursService } from './parcours.service';
const strict = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('parcours')
export class ParcoursController {
  constructor(private readonly service: ParcoursService) {}
  @Get('disponibilite')
  @Header('Cache-Control', 'no-store')
  capability() {
    return { actif: this.service.enabled() };
  }

  @Post('evenements')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 15 } })
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async ingest(@Body() raw: unknown) {
    // Global whitelist must not erase unknown fields before strict rejection.
    const dto: ParcoursBatchDto = await strict.transform(raw, {
      type: 'body',
      metatype: ParcoursBatchDto,
    });
    return this.service.ingest(dto);
  }

  @Get('rapport')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Header('Referrer-Policy', 'no-referrer')
  report(@Query('debut') debut: string, @Query('fin') fin: string) {
    return this.service.report(debut, fin);
  }
}
