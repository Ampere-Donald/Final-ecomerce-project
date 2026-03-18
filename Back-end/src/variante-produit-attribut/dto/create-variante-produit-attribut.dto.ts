import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateVarianteProduitAttributDto {
  @IsUUID()
  varianteProduitId: string;

  @IsUUID()
  attributId: string;

  @IsOptional()
  @IsUUID()
  valeurId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  valeurPersonnalisee?: string;
}
