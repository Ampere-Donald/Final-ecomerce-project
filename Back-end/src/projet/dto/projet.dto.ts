import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsDateString,
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
  ValidateNested,
} from 'class-validator';
import { NiveauProjet } from '@prisma/client';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ProjetLigneDto {
  @IsOptional() @IsUUID() produitId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  referenceSouhaitee?: string;
  @IsString() @MinLength(1) @MaxLength(150) @Transform(trim) role: string;
  @IsInt() @Min(1) @Max(10000) quantite: number;
  @IsBoolean() necessaire: boolean;
}
export class ProjetDocumentDto {
  @IsString() @MinLength(1) @MaxLength(120) @Transform(trim) titre: string;
  @IsString() @MaxLength(2048) @Transform(trim) url: string;
}
export class CreateProjetDto {
  @IsUUID() requestId: string;
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MinLength(3)
  @MaxLength(100)
  slug: string;
  @IsString() @MinLength(3) @MaxLength(150) @Transform(trim) titre: string;
  @IsOptional() @IsString() @MaxLength(150) @Transform(trim) titreEn?: string;
  @IsString() @MaxLength(500) @Transform(trim) resume: string;
  @IsOptional() @IsString() @MaxLength(500) @Transform(trim) resumeEn?: string;
  @IsString() @MaxLength(3000) @Transform(trim) objectif: string;
  @IsString() @MaxLength(3000) @Transform(trim) prerequis: string;
  @IsString() @MaxLength(3000) @Transform(trim) contraintes: string;
  @IsEnum(NiveauProjet) niveau: NiveauProjet;
  @IsOptional() @IsString() @MaxLength(2048) @Transform(trim) imageUrl?: string;
  @IsInt() @Min(0) @Max(100000) ordre: number;
  @IsOptional() @IsDateString() debutPublication?: string;
  @IsOptional() @IsDateString() finPublication?: string;
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ProjetDocumentDto)
  documents: ProjetDocumentDto[];
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProjetLigneDto)
  lignes: ProjetLigneDto[];
}
export class UpdateProjetDto extends CreateProjetDto {
  @IsInt() @Min(1) version: number;
}
export class ProjetMutationDto {
  @IsUUID() requestId: string;
  @IsInt() @Min(1) version: number;
}
export class ProjetVerificationDto {
  @IsUUID() ligneId: string;
  @IsString() @Matches(/^[a-f0-9]{64}$/) empreinteTechnique: string;
}
export class PublierProjetDto extends ProjetMutationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProjetVerificationDto)
  verifications: ProjetVerificationDto[];
  @Equals(true) referencesVerifiees: boolean;
  @Equals(true) materielEtQuantitesVerifies: boolean;
  @Equals(true) contraintesEtDocumentsVerifies: boolean;
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  @Transform(trim)
  noteValidation: string;
}
export class RetirerProjetDto extends ProjetMutationDto {
  @IsString() @MinLength(3) @MaxLength(500) @Transform(trim) motif: string;
}
