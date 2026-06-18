import {
  IsEnum, IsNumber, IsUUID, IsArray, ValidateNested, IsOptional, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MethodeRepartition } from '@prisma/client';

export class LignePrixFinalDto {
  @IsUUID()
  ligneAchatId: string;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  poidsOuVolume?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffDetail?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffDemiGros?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffGros?: number;

  @IsNumber() @Min(0) @Type(() => Number)
  prixDetailFinal: number;

  @IsNumber() @Min(0) @Type(() => Number)
  prixDemiGrosFinal: number;

  @IsNumber() @Min(0) @Type(() => Number)
  prixGrosFinal: number;
}

export class ValiderLotDto {
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
  @Type(() => LignePrixFinalDto)
  lignes: LignePrixFinalDto[];
}
