import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefundVenteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motif: string;
}
