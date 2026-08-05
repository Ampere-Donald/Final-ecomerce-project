import { IsBoolean, IsOptional, IsEnum } from 'class-validator';

enum MethodePaiement {
  ESPECES = 'ESPECES',
  CARTE = 'CARTE',
  MOBILE_MONEY = 'MOBILE_MONEY',
  MTN_MOBILE_MONEY = 'MTN_MOBILE_MONEY',
  ORANGE_MOBILE_MONEY = 'ORANGE_MOBILE_MONEY',
  VIREMENT = 'VIREMENT',
}

export class ProcessPickupDto {
  @IsBoolean()
  paiementSurPlace: boolean;

  @IsOptional()
  @IsEnum(MethodePaiement)
  methodePaiement?: MethodePaiement;
}
