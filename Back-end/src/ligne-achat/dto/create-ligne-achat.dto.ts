import { IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLigneAchatDto {
  @IsUUID()
  achatId: string;

  @IsUUID()
  varianteProduitId: string;

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
