import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { VarianteProduitService } from './variante-produit.service';
import { CreateVarianteProduitDto } from './dto/create-variante-produit.dto';
import { UpdateVarianteProduitDto } from './dto/update-variante-produit.dto';

@Controller('variantes-produit')
export class VarianteProduitController {
  constructor(
    private readonly varianteProduitService: VarianteProduitService,
  ) {}

  @Post()
  create(@Body() createVarianteProduitDto: CreateVarianteProduitDto) {
    return this.varianteProduitService.create(createVarianteProduitDto);
  }

  @Get()
  findAll(@Query('produitId') produitId?: string) {
    if (produitId) {
      return this.varianteProduitService.findByProduit(produitId);
    }
    return this.varianteProduitService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.varianteProduitService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVarianteProduitDto: UpdateVarianteProduitDto,
  ) {
    return this.varianteProduitService.update(id, updateVarianteProduitDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.varianteProduitService.remove(id);
  }
}
