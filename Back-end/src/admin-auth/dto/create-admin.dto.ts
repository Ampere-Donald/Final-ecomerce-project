import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  motDePasse: string;

  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsEnum(AdminRole)
  role: AdminRole;
}
