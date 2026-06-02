import { IsArray, IsEnum, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Devise } from '@prisma/client';

export class LignePreviewCmupDto {
  @IsUUID()
  produitId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantite: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixUnitaireDevise: number;
}

export class PreviewCmupDto {
  @IsEnum(Devise)
  devise: Devise;

  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  tauxVersFcfa: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LignePreviewCmupDto)
  lignes: LignePreviewCmupDto[];
}
