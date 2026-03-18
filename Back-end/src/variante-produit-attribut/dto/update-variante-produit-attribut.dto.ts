import { PartialType } from '@nestjs/mapped-types';
import { CreateVarianteProduitAttributDto } from './create-variante-produit-attribut.dto';

export class UpdateVarianteProduitAttributDto extends PartialType(
  CreateVarianteProduitAttributDto,
) {}
