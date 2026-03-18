import { PartialType } from '@nestjs/mapped-types';
import { CreateVarianteProduitDto } from './create-variante-produit.dto';

export class UpdateVarianteProduitDto extends PartialType(
  CreateVarianteProduitDto,
) {}
