import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnnulerTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motif?: string;
}
