import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class MissingPricingQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit = 24;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  inStock?: string;

  @IsOptional()
  @IsIn(['active', 'draft'])
  visibility?: string;
}

export class CompleteProductPricingDto {
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  prixDetail: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  prixDemiGros?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  prixGros?: number;

  @IsInt()
  @Min(1)
  version: number;
}
