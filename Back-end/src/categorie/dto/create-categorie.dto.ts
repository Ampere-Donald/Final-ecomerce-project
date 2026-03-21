import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;
}
