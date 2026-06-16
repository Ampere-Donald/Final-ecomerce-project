import {
  IsNumber, IsUUID, IsArray, ValidateNested, IsOptional, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LignePrixFinalDto {
  @IsUUID()
  ligneAchatId: string;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  poidsOuVolume?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffDetail?: number;

  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number)
  coeffGros?: number;

  @IsNumber() @Min(0) @Type(() => Number)
  prixDetailFinal: number;

  @IsNumber() @Min(0) @Type(() => Number)
  prixGrosFinal: number;
}

export class ValiderLotDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LignePrixFinalDto)
  lignes: LignePrixFinalDto[];
}
