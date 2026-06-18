import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MethodePaiement } from '@prisma/client';
import { PrimeDefautDto } from './create-salarie.dto';

export class UpdateBulletinDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(31)
  joursTravailles?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrimeDefautDto)
  gains?: PrimeDefautDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrimeDefautDto)
  retenuesManuelles?: PrimeDefautDto[];

  @IsOptional()
  @IsEnum(MethodePaiement)
  modePaiement?: MethodePaiement;
}

export class PayerBulletinDto {
  @IsOptional()
  @IsDateString()
  datePaiement?: string;

  @IsOptional()
  @IsEnum(MethodePaiement)
  modePaiement?: MethodePaiement;
}
