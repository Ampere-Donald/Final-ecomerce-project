import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateEcheanceDto } from './create-echeance.dto';

export class UpdateEcheanceDto extends PartialType(CreateEcheanceDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
