import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class UpdateAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  newPassword: string;
}
