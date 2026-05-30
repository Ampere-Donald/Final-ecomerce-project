import { IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class AdminLoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  // Legacy field kept so older clients can still post { email, motDePasse }.
  @IsOptional()
  @IsString()
  email?: string;

  @ValidateIf((dto) => !dto.pin)
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caracteres' })
  motDePasse?: string;

  @ValidateIf((dto) => !dto.motDePasse)
  @IsNotEmpty({ message: 'Le PIN est requis' })
  @Matches(/^\d{4,6}$/, { message: 'Le PIN doit contenir 4 a 6 chiffres' })
  pin?: string;
}

export class AdminPinLoginDto {
  @IsString()
  @IsNotEmpty({ message: "Le nom d'utilisateur est requis" })
  username: string;

  @Matches(/^\d{4,6}$/, { message: 'Le PIN doit contenir 4 a 6 chiffres' })
  pin: string;
}
