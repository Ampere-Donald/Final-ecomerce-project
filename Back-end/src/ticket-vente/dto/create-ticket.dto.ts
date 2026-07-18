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

export class LigneTicketDto {
  @IsUUID()
  produitId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantite: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  prixUnitaire?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motifRemise?: string;
}

export class CreateTicketDto {
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nomClient?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephoneClient?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  noteCaissier?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneTicketDto)
  lignes: LigneTicketDto[];
}
