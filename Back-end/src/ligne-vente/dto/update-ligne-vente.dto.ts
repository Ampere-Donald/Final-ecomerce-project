import { PartialType } from '@nestjs/mapped-types';
import { CreateLigneVenteDto } from './create-ligne-vente.dto';

export class UpdateLigneVenteDto extends PartialType(CreateLigneVenteDto) {}
