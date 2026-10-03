import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuestAccessDto } from './guest-order.controller';
import { GuestLinkService } from './guest-link.service';

export class GuestLinkDto extends GuestAccessDto {
  @IsUUID('4') challengeId: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) actionKey: string;
  @IsOptional() @IsString() @Matches(/^\d{8}$/) code?: string;
}

@Controller('commandes/guest/link')
@UseGuards(JwtAuthGuard)
export class GuestLinkController {
  constructor(private readonly links: GuestLinkService) {}

  @Post('request')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  request(@Body() dto: GuestAccessDto, @Request() req: any) {
    return this.links.request(dto.accessToken, req.user.id);
  }

  @Post()
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  link(@Body() dto: GuestLinkDto, @Request() req: any) {
    return this.links.link(
      dto.accessToken,
      dto.challengeId,
      dto.actionKey,
      req.user.id,
      dto.code,
    );
  }
}
