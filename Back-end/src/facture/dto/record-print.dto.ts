import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RecordPrintDto {
  @IsIn(['TICKET', 'FACTURE', 'PROFORMA', 'FACTURE_VIRTUELLE'])
  documentType: 'TICKET' | 'FACTURE' | 'BON_VENTE' | 'PROFORMA' | 'FACTURE_VIRTUELLE';

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsString()
  @MaxLength(80)
  documentNumber: string;

  @IsIn(['SUCCESS', 'FAILED'])
  status: 'SUCCESS' | 'FAILED';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  workstationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  printerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  errorCode?: string;
}
