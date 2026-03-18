import { IsString, IsOptional, IsUUID, MaxLength, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixGros?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixDetail?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantiteStock?: number;
}
