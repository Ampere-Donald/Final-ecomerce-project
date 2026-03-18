import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVarianteProduitDto {
  @IsUUID()
  produitId: string;

  @IsString()
  @MaxLength(50)
  codeVariante: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codeBarre?: string;

  @IsNumber()
  @Type(() => Number)
  prixAchat: number;

  @IsNumber()
  @Type(() => Number)
  prixVente: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  quantiteStock?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  seuilAlerte?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
