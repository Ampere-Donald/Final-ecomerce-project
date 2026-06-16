import {
  IsEnum,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Devise, StatutPaiement, SourceTaux } from '@prisma/client';

export class LigneAchatDto {
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

  // Poids/volume issus de l'import CSV — stockés sur le brouillon, appliqués au produit à la validation.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  poids?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  volume?: number;
}

export class CreateAchatDto {
  @IsUUID()
  fournisseurId: string;

  @IsEnum(Devise)
  devise: Devise;

  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  tauxVersFcfa: number;

  @IsOptional()
  @IsEnum(SourceTaux)
  sourceTaux?: SourceTaux;

  @IsOptional()
  @IsEnum(StatutPaiement)
  statutPaiement?: StatutPaiement;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneAchatDto)
  lignesAchat: LigneAchatDto[];
}
