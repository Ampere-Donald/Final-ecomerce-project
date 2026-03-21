import { IsEnum, IsOptional } from 'class-validator';
import { StatutCommande } from '@prisma/client';

export class UpdateCommandeDto {
  @IsOptional()
  @IsEnum(StatutCommande)
  statut?: StatutCommande;
}
