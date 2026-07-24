import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class FermerCaisseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsOptional()
  @IsUUID()
  coffreId?: string;
}
