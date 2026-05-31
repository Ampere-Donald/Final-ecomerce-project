import { IsEnum } from 'class-validator';
import { MethodePaiement } from '@prisma/client';

export class EncaisserTicketDto {
  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;
}
