import { IsString, MaxLength } from 'class-validator';

export class AnnulerCaisseDto {
  @IsString()
  @MaxLength(255)
  motifAnnulation: string;
}
