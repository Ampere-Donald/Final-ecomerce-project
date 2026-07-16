import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class DiagnosticEventDto {
  @IsIn(['SYNC_FAILURE', 'FRONTEND_ERROR'])
  action: 'SYNC_FAILURE' | 'FRONTEND_ERROR';

  @IsString()
  @MaxLength(80)
  code: string;

  @IsOptional()
  @IsIn(['VENTE', 'BON', 'TICKET'])
  operationKind?: 'VENTE' | 'BON' | 'TICKET';

  @IsOptional()
  @IsUUID()
  operationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  workstationId?: string;

  @IsOptional()
  @IsIn(['RETRY', 'CONFLICT'])
  state?: 'RETRY' | 'CONFLICT';
}
