import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VerdictRemplacement } from '@prisma/client';

export class ReplacementCaseDto {
  @IsInt() @Min(0) version: number;
  @IsString() @MinLength(1) @MaxLength(255) reference: string;
  @IsOptional() @IsUUID() cibleId?: string | null;
  @IsUUID() candidatId: string;
  @IsString() @MinLength(1) @MaxLength(500) application: string;
  @IsEnum(VerdictRemplacement) verdict: VerdictRemplacement;
  @IsString() @MinLength(1) @MaxLength(1500) justification: string;
  @IsString() @MinLength(1) @MaxLength(1500) limites: string;
  @IsOptional() @IsString() @MaxLength(1500) adaptations?: string | null;
  @IsString() @MinLength(1) @MaxLength(800) sourceUrl: string;
  @IsString() @MinLength(1) @MaxLength(200) sourceDocument: string;
  @IsString() @MinLength(1) @MaxLength(160) sourceRepere: string;
  @IsOptional() @IsString() @MaxLength(100) sourceRevision?: string | null;
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  valeurIds: string[];
  @IsBoolean() retire: boolean;
}

export class ReviewReplacementDto {
  @IsInt() @Min(1) version: number;
  @IsString() @Matches(/^[a-f0-9]{64}$/) empreinte: string;
  @Equals(true) confirmerRelecture: boolean;
}

export class EvaluateReplacementDto {
  @IsOptional() @IsString() @MaxLength(255) query?: string;
  @IsOptional() @IsUUID() produitId?: string;
  @IsString() @MaxLength(500) application: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsUUID('all', { each: true })
  candidatIds: string[];
}

export class FindReplacementDto {
  @IsOptional() @IsString() @MaxLength(255) query?: string;
  @IsOptional() @IsUUID() produitId?: string;
  @IsOptional() @IsString() @MaxLength(500) application?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000) page?: number;
}
