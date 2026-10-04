import {
  IsIn,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const AVIS_MOTIFS = [
  'DONNEES_PERSONNELLES',
  'INJURES_MENACES',
  'SPAM',
  'HORS_SUJET',
] as const;
export type AvisMotif = (typeof AVIS_MOTIFS)[number];
export class CreateAvisDto {
  @IsUUID('4') requestId: string;
  @IsUUID() ligneCommandeId: string;
  @IsInt() @Min(1) @Max(5) note: number;
  @IsString() @MinLength(10) @MaxLength(2000) texte: string;
  @IsString() @MinLength(2) @MaxLength(40) pseudonyme: string;
  @IsOptional() @IsString() @MaxLength(300) projetRealise?: string;
  @IsOptional() @IsString() @MinLength(16) @MaxLength(349528) photo?: string;
}
export class ModererAvisDto {
  @IsUUID('4') requestId: string;
  @IsInt() @Min(1) expectedVersion: number;
  @IsIn(['PUBLIER', 'REFUSER', 'REPONDRE']) action:
    | 'PUBLIER'
    | 'REFUSER'
    | 'REPONDRE';
  @IsOptional() @IsIn(AVIS_MOTIFS) motif?: AvisMotif;
  @IsOptional() @IsString() @MaxLength(1000) reponse?: string;
  @IsOptional() @IsBoolean() photoPubliee?: boolean;
  @IsOptional() @IsIn(AVIS_MOTIFS) photoMotif?: AvisMotif;
}
export class SignalerAvisDto {
  @IsIn(AVIS_MOTIFS) motif: AvisMotif;
}
