import { IsEmail, IsNotEmpty, IsOptional, IsIn, MinLength, Matches } from 'class-validator';

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
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  motDePasse: string;
}
