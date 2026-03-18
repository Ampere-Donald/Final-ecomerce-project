import { PartialType } from '@nestjs/mapped-types';
import { CreateValeurAttributDto } from './create-valeur-attribut.dto';

export class UpdateValeurAttributDto extends PartialType(
  CreateValeurAttributDto,
) {}
