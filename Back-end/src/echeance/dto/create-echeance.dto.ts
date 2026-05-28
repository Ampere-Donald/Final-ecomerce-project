import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurrenceEcheance } from '@prisma/client';

export class CreateEcheanceDto {
  @IsString()
  @MaxLength(150)
  titre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  coffreId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  montantCible?: number;

  @IsDateString()
  dateEcheance: string;

  @IsEnum(RecurrenceEcheance)
  recurrence: RecurrenceEcheance;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Type(() => Number)
  joursAlerteAvant?: number[];
}
