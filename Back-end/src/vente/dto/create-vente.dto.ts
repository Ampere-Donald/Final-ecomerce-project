import {
  IsEnum,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement, StatutPaiement } from '@prisma/client';

export class LigneVenteDto {
  @IsUUID()
  varianteProduitId: string;

  @IsNumber()
  @Type(() => Number)
  quantite: number;

  @IsNumber()
  @Type(() => Number)
  prixUnitaire: number;
}

export class CreateVenteDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsNumber()
  @Type(() => Number)
  montantTotal: number;

  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  @IsOptional()
  @IsEnum(StatutPaiement)
  statutPaiement?: StatutPaiement;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneVenteDto)
  lignesVente: LigneVenteDto[];
}
