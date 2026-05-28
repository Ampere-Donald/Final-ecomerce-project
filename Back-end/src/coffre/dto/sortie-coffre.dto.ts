import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SortieCoffreDto {
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  montant: number;

  @IsString()
  @MaxLength(255)
  motif: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  beneficiaire?: string;
}
