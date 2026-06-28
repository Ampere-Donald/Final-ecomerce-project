import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Devise } from '@prisma/client';

export class LigneCommandeDto {
  @IsUUID()
  produitId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantite: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixNegocie?: number;
}

export class CreateCommandeDto {
  @IsUUID()
  fournisseurId: string;

  @IsOptional()
  @IsEnum(Devise)
  devise?: Devise;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  tauxVersFcfa?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes: LigneCommandeDto[];
}
