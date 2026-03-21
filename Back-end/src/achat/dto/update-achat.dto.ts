import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAchatDto } from './create-achat.dto';

export class UpdateAchatDto extends PartialType(
  OmitType(CreateAchatDto, ['lignesAchat'] as const),
) {}
