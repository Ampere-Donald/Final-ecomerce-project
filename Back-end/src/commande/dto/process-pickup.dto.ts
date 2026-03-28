import { IsBoolean, IsOptional, IsEnum } from 'class-validator';

enum MethodePaiement {
  ESPECES = 'ESPECES',
  CARTE = 'CARTE',
  MOBILE_MONEY = 'MOBILE_MONEY',
  VIREMENT = 'VIREMENT',
}

export class ProcessPickupDto {
  @IsBoolean()
  paiementSurPlace: boolean;

  @IsOptional()
  @IsEnum(MethodePaiement)
  methodePaiement?: MethodePaiement;
}
