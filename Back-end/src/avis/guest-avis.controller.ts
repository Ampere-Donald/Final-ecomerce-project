import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { GuestAccessDto } from '../commande/guest-order.controller';
import { CreateAvisDto } from './avis.dto';
import { GuestAvisService } from './guest-avis.service';
export class GuestAvisRequestDto extends CreateAvisDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) accessToken: string;
}
export class GuestAvisExecuteDto extends GuestAvisRequestDto {
  @IsUUID('4') challengeId: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) actionKey: string;
  @IsOptional() @IsString() @Matches(/^\d{8}$/) code?: string;
}
export class GuestAvisPhotoDto extends GuestAccessDto {
  @IsUUID('4') avisId: string;
}
@Controller('avis/guest')
export class GuestAvisController {
  constructor(private readonly service: GuestAvisService) {}
  @Post('photo')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  async photo(@Body() dto: GuestAvisPhotoDto) {
    return new StreamableFile(
      await this.service.photo(dto.accessToken, dto.avisId),
      { type: 'image/webp' },
    );
  }
  @Post('purchases')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  purchases(@Body() dto: GuestAccessDto) {
    return this.service.purchases(dto.accessToken);
  }
  @Post('request')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  request(@Body() dto: GuestAvisRequestDto) {
    return this.service.request(dto.accessToken, dto);
  }
  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  execute(@Body() dto: GuestAvisExecuteDto) {
    return this.service.execute(
      dto.accessToken,
      dto.challengeId,
      dto.actionKey,
      dto,
      dto.code,
    );
  }
}
