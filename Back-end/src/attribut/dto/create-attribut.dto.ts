import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { CleAttributTechnique, TypeAttribut } from '@prisma/client';

export class CreateAttributDto {
  @IsUUID()
  produitId: string;

  @IsString()
  @MaxLength(100)
  nomAttribut: string;

  @IsOptional()
  @IsEnum(CleAttributTechnique)
  cleTechnique?: CleAttributTechnique | null;

  @IsEnum(TypeAttribut)
  typeAttribut: TypeAttribut;

  @IsOptional()
  @IsBoolean()
  obligatoire?: boolean;
}
