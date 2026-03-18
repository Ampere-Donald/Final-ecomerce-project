import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { TypeAttribut } from '@prisma/client';

export class CreateAttributDto {
  @IsUUID()
  produitId: string;

  @IsString()
  @MaxLength(100)
  nomAttribut: string;

  @IsEnum(TypeAttribut)
  typeAttribut: TypeAttribut;

  @IsOptional()
  @IsBoolean()
  obligatoire?: boolean;
}
