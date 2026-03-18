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
import { VarianteProduitAttributService } from './variante-produit-attribut.service';
import { CreateVarianteProduitAttributDto } from './dto/create-variante-produit-attribut.dto';
import { UpdateVarianteProduitAttributDto } from './dto/update-variante-produit-attribut.dto';

@Controller('variantes-produit-attribut')
export class VarianteProduitAttributController {
  constructor(
    private readonly varianteProduitAttributService: VarianteProduitAttributService,
  ) {}

  @Post()
  create(@Body() createDto: CreateVarianteProduitAttributDto) {
    return this.varianteProduitAttributService.create(createDto);
  }

  @Get()
  findAll(@Query('varianteProduitId') varianteProduitId?: string) {
    if (varianteProduitId) {
      return this.varianteProduitAttributService.findByVariante(
        varianteProduitId,
      );
    }
    return this.varianteProduitAttributService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.varianteProduitAttributService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVarianteProduitAttributDto,
  ) {
    return this.varianteProduitAttributService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.varianteProduitAttributService.remove(id);
  }
}
