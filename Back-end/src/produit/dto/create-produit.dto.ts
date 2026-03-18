import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateProduitDto {
  @IsUUID()
  categorieId: string;

  @IsString()
  @MaxLength(150)
  nomProduit: string;

  @IsString()
  @MaxLength(100)
  marque: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
