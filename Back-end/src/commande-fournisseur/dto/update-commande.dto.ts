import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LigneCommandeDto } from './create-commande.dto';

export class UpdateCommandeDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tauxVersFcfa?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes?: LigneCommandeDto[];
}
