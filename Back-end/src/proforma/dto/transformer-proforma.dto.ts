import { IsEnum } from 'class-validator';
import { MethodePaiement } from '@prisma/client';

export class TransformerProformaDto {
  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;
}
