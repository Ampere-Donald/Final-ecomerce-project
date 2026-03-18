import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TypeOperation } from '@prisma/client';

export class CreateCaisseDto {
  @IsEnum(TypeOperation)
  typeOperation: TypeOperation;

  @IsNumber()
  @Type(() => Number)
  montant: number;

  @IsString()
  @MaxLength(255)
  motif: string;

  @IsOptional()
  @IsUUID()
  venteId?: string;

  @IsOptional()
  @IsUUID()
  achatId?: string;
}
