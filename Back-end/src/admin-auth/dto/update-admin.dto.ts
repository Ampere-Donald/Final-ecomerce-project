import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class UpdateAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsString()
  @MinLength(8)
  motDePasse?: string;

  @IsOptional()
  @Matches(/^\d{4,6}$/)
  pin?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  motifRole?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  peutVendreSousDemiGros?: boolean;

  @IsOptional()
  @IsBoolean()
  mustChangeCredential?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangeRoleDto {
  @IsEnum(AdminRole)
  role: AdminRole;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePinDto {
  @Matches(/^\d{4,6}$/, { message: 'Le PIN actuel doit contenir 4 a 6 chiffres' })
  oldPin: string;

  @Matches(/^\d{4,6}$/, { message: 'Le nouveau PIN doit contenir 4 a 6 chiffres' })
  newPin: string;
}
