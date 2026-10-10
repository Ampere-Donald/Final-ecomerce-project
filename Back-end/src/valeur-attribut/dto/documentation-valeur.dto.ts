import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EtatDonneeTechnique } from '@prisma/client';

export class DocumentationValeurDto {
  @IsInt() @Min(1) produitVersion: number;
  @IsInt() @Min(0) version: number;
  @IsInt() @Min(1) valeurVersion: number;
  @IsInt() @Min(1) attributVersion: number;

  @IsIn(['INCONNU', 'A_VERIFIER', 'CONTRADICTOIRE', 'NON_APPLICABLE'])
  etat: Exclude<EtatDonneeTechnique, 'DOCUMENTE'>;

  @IsOptional() @IsString() @MaxLength(40) uniteSource?: string | null;
  @IsOptional() @IsString() @MaxLength(100) valeurNormalisee?: string | null;
  @IsOptional() @IsString() @MaxLength(40) uniteNormalisee?: string | null;
  @IsOptional() @IsString() @MaxLength(500) conditions?: string | null;
  @IsOptional() @IsString() @MaxLength(800) sourceUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(200) sourceDocument?: string | null;
  @IsOptional() @IsString() @MaxLength(160) sourceRepere?: string | null;
  @IsOptional() @IsString() @MaxLength(100) sourceRevision?: string | null;
  @IsOptional() @IsString() @MaxLength(500) motif?: string | null;
}

export class RelireDocumentationDto extends DocumentationValeurDto {
  @IsBoolean() confirmerRelecture: boolean;
}
