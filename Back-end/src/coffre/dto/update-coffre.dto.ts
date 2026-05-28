import { PartialType } from '@nestjs/mapped-types';
import { CreateCoffreDto } from './create-coffre.dto';

export class UpdateCoffreDto extends PartialType(CreateCoffreDto) {}
