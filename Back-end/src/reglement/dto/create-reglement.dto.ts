import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement } from '@prisma/client';

export class CreateReglementDto {
  @IsUUID()
  venteId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  montant: number;

  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
