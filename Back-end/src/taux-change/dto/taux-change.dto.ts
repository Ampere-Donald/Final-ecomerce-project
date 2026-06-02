import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Devise, SourceTaux } from '@prisma/client';

export class GetLatestRateDto {
  @IsEnum(Devise)
  devise: Devise;
}

export class ManualRateDto {
  @IsEnum(Devise)
  devise: Devise;

  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  tauxVersFcfa: number;

  @IsOptional()
  @IsEnum(SourceTaux)
  source?: SourceTaux;
}
