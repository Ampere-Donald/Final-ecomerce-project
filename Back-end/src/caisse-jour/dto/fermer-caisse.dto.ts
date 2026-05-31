import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FermerCaisseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
