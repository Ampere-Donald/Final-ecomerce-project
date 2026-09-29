import {
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  MinLength,
  Matches,
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
  @IsOptional()
  @IsUUID('4')
  requestId?: string;

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

  /** Inline account creation fields (checkout flow) */
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Une majuscule, une minuscule et un chiffre sont requis',
  })
  motDePasse?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes: LigneCommandeDto[];
}
