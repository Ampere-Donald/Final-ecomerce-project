import { PartialType } from '@nestjs/mapped-types';
import { CreateAttributDto } from './create-attribut.dto';

export class UpdateAttributDto extends PartialType(CreateAttributDto) {}
