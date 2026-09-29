import { Type, Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ModeReception } from "@prisma/client";

export class ReferenceDevisDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reference: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  quantite: number;

  @IsOptional()
  @IsUUID()
  produitId?: string;
}

export class ResolveDevisDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReferenceDevisDto)
  lignes: ReferenceDevisDto[];
}

export class CreateDemandeDevisDto extends ResolveDevisDto {
  @IsUUID()
  requestId: string;

  @IsString()
  @Matches(/^[+0-9 ()-]{6,30}$/)
  telephone: string;

  @IsEnum(ModeReception)
  modeReception: ModeReception;

  @ValidateIf(
    (value: CreateDemandeDevisDto) =>
      value.modeReception === ModeReception.LIVRAISON,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RepondreDevisDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motifRemise?: string;

  @IsInt()
  @Min(1)
  version: number;

  @IsIn(["A_PRECISER", "ENVOYEE", "REFUSEE"])
  statut: "A_PRECISER" | "ENVOYEE" | "REFUSEE";

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  message: string;

  @ValidateIf((value: RepondreDevisDto) => value.statut === "ENVOYEE")
  @IsUUID()
  proformaId?: string;
}

export class ClarifierDevisDto extends CreateDemandeDevisDto {
  @IsInt()
  @Min(1)
  version: number;
}

export class AccepterDevisDto {
  @IsUUID("4")
  requestId: string;

  @IsInt()
  @Min(1)
  version: number;

  @IsBoolean()
  @Equals(true)
  conditionsAcceptees: boolean;
}
