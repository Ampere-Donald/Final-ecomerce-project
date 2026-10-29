import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CatalogueChangesDto {
  @IsOptional() @IsString() @MaxLength(150) nomProduit?: string;
  @IsOptional() @IsString() @MaxLength(100) marque?: string | null;
  @IsOptional() @IsString() @MaxLength(150) referenceFabricant?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) imageUrl?: string | null;
  @IsOptional() @IsNumber() @Min(0) prixDetail?: number | null;
  @IsOptional() @IsNumber() @Min(0) prixDemiGros?: number | null;
  @IsOptional() @IsNumber() @Min(0) prixGros?: number | null;
  @IsOptional() @IsNumber() @Min(0) prixPromo?: number | null;
  @IsOptional() @IsDateString() finPromo?: string | null;
  @IsOptional() @IsInt() @Min(1) quantiteGros?: number | null;
  @IsOptional() @IsUUID() categorieId?: string;
  @IsOptional() @IsUUID() sousCategorieId?: string | null;
}

export class CatalogueMutationDto {
  @IsUUID() operationId: string;
  @IsIn(['PROPOSER', 'VALIDER', 'ACCEPTER', 'REFUSER', 'DISCUTER', 'ARCHIVER'])
  action: string;
  @IsIn([
    'PRIX',
    'CLASSEMENT',
    'IDENTIFICATION',
    'PHOTO',
    'COMPLET',
    'ARCHIVAGE',
  ])
  sujet: string;
  @IsOptional()
  @IsIn(['CONFIRMATION', 'CORRECTION', 'DISCUSSION'])
  type?: string;
  @IsOptional() @IsUUID() propositionId?: string;
  @IsInt() @Min(1) prixRevision: number;
  @IsInt() @Min(1) classementRevision: number;
  @IsInt() @Min(1) commercialRevision: number;
  @IsOptional() @IsInt() @Min(1) identificationRevision?: number;
  @IsOptional() @IsInt() @Min(1) photoRevision?: number;
  @IsOptional() @IsString() @MaxLength(1000) commentaire?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => CatalogueChangesDto)
  changements?: CatalogueChangesDto;
}

export class CatalogueBatchItemDto extends CatalogueMutationDto {
  @IsUUID() produitId: string;
}
export class CatalogueBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CatalogueBatchItemDto)
  items: CatalogueBatchItemDto[];
}

export class SousCategorieDto {
  @IsUUID() categorieId: string;
  @IsString() @MaxLength(100) nom: string;
}
