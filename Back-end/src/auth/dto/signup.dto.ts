import { IsEmail, IsNotEmpty, IsOptional, IsIn, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty({ message: 'Le nom complet est requis' })
  nom: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsOptional()
  telephone?: string;

  @IsIn(['PARTICULIER', 'PROFESSIONNEL'], { message: 'Type de client invalide' })
  @IsOptional()
  typeClient?: 'PARTICULIER' | 'PROFESSIONNEL';

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  motDePasse: string;
}
