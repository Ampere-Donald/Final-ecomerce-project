import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement, TypeFacture } from '@prisma/client';

export class EncaisserTicketDto {
  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  @IsOptional()
  @IsEnum(TypeFacture)
  documentType: TypeFacture = TypeFacture.TICKET_CAISSE;

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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  montantRecu?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencePaiement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;

  @IsOptional()
  @IsDateString()
  dateEcheance?: string;
}
