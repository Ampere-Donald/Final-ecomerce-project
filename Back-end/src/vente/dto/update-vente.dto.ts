import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateVenteDto } from './create-vente.dto';

export class UpdateVenteDto extends PartialType(
  OmitType(CreateVenteDto, ['lignesVente'] as const),
) {}
