import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateParametrePaieDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  raisonSociale?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  niu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rccm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cnpsEmployeur?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  secteurActivite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  signataireNom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  signataireQualite?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  tauxCnps?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  plafondCnps?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  tauxCfc?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  tauxCac?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  abattementIrppAnnuel?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  tauxFraisProIrpp?: number;
}
