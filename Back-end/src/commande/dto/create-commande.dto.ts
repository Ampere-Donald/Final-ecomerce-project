import {
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModeReception } from '@prisma/client';

export class LigneCommandeDto {
  @IsUUID()
  produitId: string;

  @IsString()
  @IsNotEmpty()
  nomProduit: string;

  @IsNumber()
  @Type(() => Number)
  quantite: number;

  @IsNumber()
  @Type(() => Number)
  prixUnitaire: number;
}

export class CreateCommandeDto {
  @IsString()
  @MinLength(2)
  nomClient: string;

  @IsString()
  @MinLength(6)
  telephone: string;

  @IsString()
  @IsNotEmpty()
  adresseLivraison: string;

  @IsNumber()
  @Type(() => Number)
  montantTotal: number;

  @IsEnum(ModeReception)
  modeReception: ModeReception;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes: LigneCommandeDto[];
}
