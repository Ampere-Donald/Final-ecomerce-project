import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCoffreDto {
  @IsString()
  @MaxLength(150)
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  objectifMontant?: number;

  @IsOptional()
  @IsDateString()
  dateEcheance?: string;
}
