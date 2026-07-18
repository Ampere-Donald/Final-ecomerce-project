import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement } from '@prisma/client';

export class LigneBonDto {
  @IsUUID()
  produitId: string;

  @IsInt()
  @Min(1)
  quantite: number;

  @IsNumber()
  @Type(() => Number)
  prixUnitaire: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motifRemise?: string;
}

export class CreateBonDto {
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  noteCaissier?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneBonDto)
  lignes: LigneBonDto[];
}
