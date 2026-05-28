import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransfertDto {
  @IsUUID()
  coffreId: string;

  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  montant: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motif?: string;
}
