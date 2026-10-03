import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { GuestAccessDto } from './guest-order.controller';
import { GuestActionService } from './guest-action.service';
import type { GuestAction } from './guest-action.service';

export class GuestActionRequestDto extends GuestAccessDto {
  @IsIn(['CANCEL', 'RECEIVE']) action: GuestAction;
}
export class GuestActionDto extends GuestActionRequestDto {
  @IsUUID('4') challengeId: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) actionKey: string;
  @IsOptional() @IsString() @Matches(/^\d{8}$/) code?: string;
}
@Controller('commandes/guest/actions')
export class GuestActionController {
  constructor(private readonly actions: GuestActionService) {}

  @Post('request')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  request(@Body() dto: GuestActionRequestDto) {
    return this.actions.request(dto.accessToken, dto.action);
  }

  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  execute(@Body() dto: GuestActionDto) {
    return this.actions.execute(
      dto.accessToken,
      dto.action,
      dto.challengeId,
      dto.actionKey,
      dto.code,
    );
  }
}
