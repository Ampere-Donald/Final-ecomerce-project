import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export const MOTIFS_INCOMPATIBILITE = [
  'TENSION',
  'BROCHAGE',
  'FORMAT',
  'FONCTION',
  'AUTRE',
] as const;
export class CreateIncompatibiliteDto {
  @IsUUID('4') requestId: string;
  @IsUUID() ligneCommandeId: string;
  @IsInt() @Min(1) @Max(1000000) quantite: number;
  @IsIn(MOTIFS_INCOMPATIBILITE) motif: (typeof MOTIFS_INCOMPATIBILITE)[number];
  @IsString() @MinLength(10) @MaxLength(2000) description: string;
}
export class DecisionIncompatibiliteDto {
  @IsUUID('4') requestId: string;
  @IsInt() @Min(1) expectedVersion: number;
  @IsIn(['EN_EXAMEN', 'RESOLU_SANS_RETOUR', 'CLOTURE', 'RETOUR_CONFIRME'])
  action: 'EN_EXAMEN' | 'RESOLU_SANS_RETOUR' | 'CLOTURE' | 'RETOUR_CONFIRME';
  @IsString() @MinLength(10) @MaxLength(1000) reponse: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000000) retourQuantite?: number;
  @IsOptional()
  @IsIn(MOTIFS_INCOMPATIBILITE)
  diagnostic?: (typeof MOTIFS_INCOMPATIBILITE)[number];
}
