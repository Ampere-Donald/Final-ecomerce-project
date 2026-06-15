import { IsEnum, IsNumber, IsOptional, IsString, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MajorationLigneDto {
  @IsString()
  factureReelleLigneId: string;

  @IsNumber()
  @Min(1)
  @Max(200)
  pourcentage: number;
}

export class CreateFactureVirtuelleDto {
  @IsString()
  factureReelleId: string;

  @IsEnum(['GLOBAL', 'PAR_LIGNE'])
  mode: 'GLOBAL' | 'PAR_LIGNE';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  pourcentageMajoration?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MajorationLigneDto)
  majorationsParLigne?: MajorationLigneDto[];
}
