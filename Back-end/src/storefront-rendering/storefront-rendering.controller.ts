import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorefrontRenderingService } from './storefront-rendering.service';

@Controller('storefront')
export class StorefrontRenderingController {
  constructor(private readonly rendering: StorefrontRenderingService) {}

  @Get('catalogue')
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  async catalogue(@Query('url') url: unknown, @Query('renderer') renderer: unknown,
    @Res({ passthrough: true }) response: Response) {
    // Always anonymous. Cookies or staff credentials never select private
    // prices, stock or products for the HTML consumed by the public Worker.
    const result = await this.rendering.catalogue(url, renderer);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('X-Catalogue-Renderer', result.rendererId);
    return result.html;
  }
}
