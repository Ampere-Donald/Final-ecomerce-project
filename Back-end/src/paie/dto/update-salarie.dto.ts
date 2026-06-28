import { PartialType } from '@nestjs/mapped-types';
import { CreateSalarieDto } from './create-salarie.dto';

export class UpdateSalarieDto extends PartialType(CreateSalarieDto) {}
