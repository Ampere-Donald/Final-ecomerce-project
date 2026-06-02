import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
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
}

export class CreateBonDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneBonDto)
  lignes: LigneBonDto[];
}
