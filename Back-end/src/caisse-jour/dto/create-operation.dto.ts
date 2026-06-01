import {
  IsEnum,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TypeOperation } from '@prisma/client';

export class CreateOperationDto {
  @IsEnum(TypeOperation)
  typeOperation: TypeOperation;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  montant: number;

  @IsString()
  @MaxLength(255)
  motif: string;
}
