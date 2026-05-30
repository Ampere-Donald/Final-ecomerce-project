import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class CreateAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  motDePasse?: string;

  @IsOptional()
  @Matches(/^\d{4,6}$/)
  pin?: string;

  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsEnum(AdminRole)
  role: AdminRole;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
