import {
  IsEnum, IsNumber, IsUUID, IsArray, ValidateNested, IsOptional, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MethodeRepartition } from '@prisma/client';

export class LigneCalculDto {
  @IsUUID()
  produitId: string;

  @IsNumber() @Min(1) @Type(() => Number)
  quantite: number;

  @IsNumber() @Min(0) @Type(() => Number)
  prixUnitaireDevise: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  poidsOuVolume?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffDetail?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffDemiGros?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffGros?: number;
}

export class CalculerLotDto {
  @IsNumber() @Min(0) @Type(() => Number)
  fraisTransport: number;

  @IsNumber() @Min(0) @Type(() => Number)
  fraisDouane: number;

  @IsEnum(MethodeRepartition)
  methodeRepartition: MethodeRepartition;

  @IsNumber() @Min(1.01) @Type(() => Number)
  coeffDetailDefault: number;

  @IsNumber() @Min(1.01) @Type(() => Number)
  coeffDemiGrosDefault: number;

  @IsNumber() @Min(1.01) @Type(() => Number)
  coeffGrosDefault: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCalculDto)
  lignes: LigneCalculDto[];
}
