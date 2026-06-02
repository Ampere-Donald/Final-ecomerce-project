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
