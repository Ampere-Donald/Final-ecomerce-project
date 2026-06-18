import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LigneProformaDto {
  @IsUUID()
  produitId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantite: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixUnitaire: number;
}

export class CreateProformaDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  clientNom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  clientNiu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  clientRccm?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneProformaDto)
  lignes: LigneProformaDto[];
}
