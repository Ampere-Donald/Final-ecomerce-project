import { IsString, IsOptional, IsUUID, MaxLength, IsNumber, IsInt, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProduitDto {
  @IsUUID()
  categorieId: string;

  @IsString()
  @MaxLength(150)
  nomProduit: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  designationEn?: string;

  @IsString()
  @MaxLength(100)
  marque: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codeFamille?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl2?: string;

  @IsOptional()
  @IsString()
  imageUrl3?: string;

  // Virtual field to receive the list of images kept by the user
  @IsOptional()
  existingImages?: string | string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixGros?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantiteGros?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixDemiGros?: number;

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

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  seuilAlerte?: number;

  @IsOptional()
  @IsString()
  urlDatasheet?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixPromo?: number;

  @IsOptional()
  @IsString()
  finPromo?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPopulaire?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  poids?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  volume?: number;
}
