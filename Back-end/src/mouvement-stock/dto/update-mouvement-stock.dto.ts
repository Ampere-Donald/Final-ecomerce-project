import { PartialType } from '@nestjs/mapped-types';
import { CreateMouvementStockDto } from './create-mouvement-stock.dto';

export class UpdateMouvementStockDto extends PartialType(
  CreateMouvementStockDto,
) {}
