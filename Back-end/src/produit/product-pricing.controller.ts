import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { Roles } from '../admin-auth/roles.decorator';
import {
  CompleteProductPricingDto,
  MissingPricingQueryDto,
} from './dto/complete-product-pricing.dto';
import {
  ProductPricingService,
  PRICING_STAFF_ROLES,
} from './product-pricing.service';

@Controller('catalogue-pricing')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles(...PRICING_STAFF_ROLES)
export class ProductPricingController {
  constructor(private readonly pricing: ProductPricingService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: MissingPricingQueryDto) {
    return this.pricing.list(query);
  }

  @Patch(':id')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CompleteProductPricingDto,
    @Request() req: any,
  ) {
    return this.pricing.complete(id, input, req.user);
  }
}
