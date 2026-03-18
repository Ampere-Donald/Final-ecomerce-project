import { IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLigneVenteDto {
  @IsUUID()
  venteId: string;

  @IsUUID()
  produitId: string;

  @IsNumber()
  @Type(() => Number)
  quantite: number;

  @IsNumber()
  @Type(() => Number)
  prixUnitaire: number;

  @IsNumber()
  @Type(() => Number)
  sousTotal: number;
}
