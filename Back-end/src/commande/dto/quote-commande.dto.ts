import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
class QuoteLineDto {
  @IsUUID() produitId: string;
  @IsInt() @Min(1) @Type(() => Number) quantite: number;
}
export class QuoteCommandeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lignes: QuoteLineDto[];
}
