import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateFournisseurDto {
  @IsString()
  @MaxLength(150)
  nomEntreprise: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactNom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  adresse?: string;
}
