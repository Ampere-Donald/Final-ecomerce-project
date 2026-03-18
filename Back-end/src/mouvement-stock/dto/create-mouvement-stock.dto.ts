import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TypeMouvement } from '@prisma/client';

export class CreateMouvementStockDto {
  @IsUUID()
  produitId: string;

  @IsEnum(TypeMouvement)
  typeMouvement: TypeMouvement;

  @IsNumber()
  @Type(() => Number)
  quantite: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motif?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idReference?: number;
}
