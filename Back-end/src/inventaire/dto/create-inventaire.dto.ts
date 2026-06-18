import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInventaireDto {
  @IsOptional()
  @IsUUID()
  categorieId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codeFamille?: string;
}
