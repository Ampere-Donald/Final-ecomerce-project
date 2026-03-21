import { Controller, Post, Body } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SubscribeDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide.' })
  @IsNotEmpty()
  email: string;
}

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post()
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto.email.toLowerCase().trim());
  }
}
