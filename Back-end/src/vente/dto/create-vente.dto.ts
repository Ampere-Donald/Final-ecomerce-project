import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  IsArray,
  MaxLength,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement, StatutPaiement } from '@prisma/client';

export class LigneVenteDto {
  @IsUUID()
  produitId: string;

  @IsNumber()
  @Type(() => Number)
  quantite: number;

  @IsNumber()
  @Type(() => Number)
  prixUnitaire: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motifRemise?: string;
}

export class CreateVenteDto {
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

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
