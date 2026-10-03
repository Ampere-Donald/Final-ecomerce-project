import {
  Body,
  Controller,
  Header,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import { GuestOrderService } from './guest-order.service';

export class GuestAccessDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  accessToken: string;
}
export class RevokeGuestAccessDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
export class GuestRecoveryDto {
  @IsString()
  @MaxLength(30)
  numeroSuivi: string;

  @IsEmail()
  @MaxLength(254)
  email: string;
}
export class GuestRecoverDto extends GuestAccessDto {
  @IsUUID('4')
  challengeId: string;

  @IsString()
  @Matches(/^\d{8}$/)
  code: string;
}

@Controller('commandes/guest')
export class GuestOrderController {
  constructor(private readonly guests: GuestOrderService) {}

  @Get('channels')
  @Header('Cache-Control', 'private, no-store')
  channels() {
    return this.guests.channels();
  }

  @Post('recovery')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  requestRecovery(@Body() dto: GuestRecoveryDto) {
    return this.guests.requestRecovery(dto.numeroSuivi, dto.email);
  }

  @Post('recover')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  recover(@Body() dto: GuestRecoverDto) {
    return this.guests.recover(dto.challengeId, dto.code, dto.accessToken);
  }

  @Post('access')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  access(@Body() dto: GuestAccessDto) {
    return this.guests.read(dto.accessToken);
  }

  @Post('admin/:id/revoke')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: RevokeGuestAccessDto,
  ) {
    return this.guests.revoke(id, req.user.id, dto.reason);
  }
}
