import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MethodePaiement, TypeContrat } from '@prisma/client';

export class PrimeDefautDto {
  @IsString()
  @MaxLength(150)
  libelle: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  montant: number;
}

export class CreateSalarieDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  matricule?: string;

  @IsString()
  @MaxLength(150)
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  prenom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  lieuNaissance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroCnps?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  niu?: string;

  @IsString()
  @MaxLength(150)
  poste: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categorie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  echelon?: string;

  @IsDateString()
  dateEmbauche: string;

  @IsOptional()
  @IsEnum(TypeContrat)
  typeContrat?: TypeContrat;

  @IsOptional()
  @IsDateString()
  dateFinContrat?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salaireBase: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrimeDefautDto)
  primesParDefaut?: PrimeDefautDto[];

  @IsOptional()
  @IsEnum(MethodePaiement)
  modePaiement?: MethodePaiement;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  banque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  compteBancaire?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsString()
  adminUserId?: string;
}
