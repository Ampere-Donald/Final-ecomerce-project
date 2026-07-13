import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelVenteDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motif?: string;
}
