import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDelegationDto {
  @IsUUID()
  adminUserId: string;

  /** Fin de la période de délégation (ISO date). */
  @IsDateString()
  finAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motif?: string;
}
