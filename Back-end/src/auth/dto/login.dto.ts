import { IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: "L'email ou le téléphone est requis" })
  identifiant: string; // email or phone

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6)
  motDePasse: string;
}
