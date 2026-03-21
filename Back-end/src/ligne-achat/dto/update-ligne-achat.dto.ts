import { PartialType } from '@nestjs/mapped-types';
import { CreateLigneAchatDto } from './create-ligne-achat.dto';

export class UpdateLigneAchatDto extends PartialType(CreateLigneAchatDto) {}
