import {
  IsEnum,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatutPaiement } from '@prisma/client';

export class LigneAchatDto {
  @IsUUID()
  varianteProduitId: string;

  @IsNumber()
  @Type(() => Number)
  quantite: number;

  @IsNumber()
  @Type(() => Number)
  prixUnitaire: number;
}

export class CreateAchatDto {
  @IsUUID()
  fournisseurId: string;

  @IsNumber()
  @Type(() => Number)
  montantTotal: number;

  @IsOptional()
  @IsEnum(StatutPaiement)
  statutPaiement?: StatutPaiement;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneAchatDto)
  lignesAchat: LigneAchatDto[];
}
