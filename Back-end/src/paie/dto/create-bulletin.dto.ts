import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MethodePaiement } from '@prisma/client';
import { PrimeDefautDto } from './create-salarie.dto';

export class PreviewBulletinDto {
  @IsUUID()
  salarieId: string;

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
}

export class CreateBulletinDto extends PreviewBulletinDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'periode doit être au format YYYY-MM' })
  periode: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(31)
  joursTravailles?: number;

  @IsOptional()
  @IsEnum(MethodePaiement)
  modePaiement?: MethodePaiement;
}
