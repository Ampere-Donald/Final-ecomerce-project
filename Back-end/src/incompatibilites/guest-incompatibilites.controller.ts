import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { PrivateFailureInterceptor } from './private-failure.interceptor';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { GuestAccessDto } from '../commande/guest-order.controller';
import { CreateIncompatibiliteDto } from './incompatibilites.dto';
import { GuestIncompatibilitesService } from './guest-incompatibilites.service';
class GuestRequestDto extends CreateIncompatibiliteDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) accessToken: string;
}
class GuestExecuteDto extends GuestRequestDto {
  @IsUUID('4') challengeId: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) actionKey: string;
  @IsOptional() @IsString() @Matches(/^\d{8}$/) code?: string;
}
const strict = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
@Controller('incompatibilites/guest')
@UseInterceptors(PrivateFailureInterceptor)
export class GuestIncompatibilitesController {
  constructor(private readonly service: GuestIncompatibilitesService) {}
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Post('purchases')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async purchases(@Body() raw: unknown) {
    const dto = await strict.transform(raw, {
      type: 'body',
      metatype: GuestAccessDto,
    });
    return this.service.purchases(dto.accessToken);
  }
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Post('request')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async request(@Body() raw: unknown) {
    const dto = await strict.transform(raw, {
      type: 'body',
      metatype: GuestRequestDto,
    });
    return this.service.request(dto.accessToken, dto);
  }
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async execute(@Body() raw: unknown) {
    const dto = await strict.transform(raw, {
      type: 'body',
      metatype: GuestExecuteDto,
    });
    return this.service.execute(
      dto.accessToken,
      dto.challengeId,
      dto.actionKey,
      dto,
      dto.code,
    );
  }
}
