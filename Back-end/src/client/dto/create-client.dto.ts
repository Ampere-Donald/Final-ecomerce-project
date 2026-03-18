import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom?: string;

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
