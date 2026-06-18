import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LigneComptageDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockCompte: number;
}

export class ComptageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneComptageDto)
  lignes: LigneComptageDto[];
}
