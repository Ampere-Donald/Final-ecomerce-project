import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement } from '@prisma/client';

export class EncaisserTicketDto {
  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  /** Client enregistré — obligatoire pour un encaissement à CRÉDIT. */
  @IsOptional()
  @IsUUID()
  clientId?: string;

  /** Acompte versé immédiatement lors d'une vente à crédit (0 par défaut). */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  montantPaye?: number;
}
