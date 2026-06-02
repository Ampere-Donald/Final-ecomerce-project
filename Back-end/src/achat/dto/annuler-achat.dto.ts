import { IsOptional, IsString } from 'class-validator';

export class AnnulerAchatDto {
  @IsOptional()
  @IsString()
  motifAnnulation?: string;
}
