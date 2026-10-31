import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsUUID,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ACQUISITION_CHANNELS } from './acquisition';
import type { AcquisitionChannel } from './acquisition';

export const PARCOURS_EVENTS = [
  'RECHERCHE_VIDE',
  'FICHE_OUVERTE',
  'AJOUT_PANIER',
  'FRAIS_VUS',
  'SORTIE_APRES_FRAIS',
  'REACHAT_AJOUTE',
  'WHATSAPP_OUVERT',
  'CONSEIL_OUVERT',
  'DEVIS_COMMENCE',
] as const;
export const PARCOURS_RECEPTIONS = [
  'GENERAL',
  'RETRAIT',
  'LIVRAISON_A_CONFIRMER',
  'LIVRAISON_CALCULEE',
] as const;
export class ParcoursEventDto {
  @IsOptional()
  @IsIn(ACQUISITION_CHANNELS)
  canalEntree?: AcquisitionChannel;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) jour: string;
  @IsUUID('4') id: string;
  @IsIn(PARCOURS_EVENTS) evenement: (typeof PARCOURS_EVENTS)[number];
  @IsIn(['fr', 'en']) langue: 'fr' | 'en';
  @IsIn(['mobile', 'tablette', 'ordinateur']) appareil:
    | 'mobile'
    | 'tablette'
    | 'ordinateur';
  @IsIn(PARCOURS_RECEPTIONS) reception: (typeof PARCOURS_RECEPTIONS)[number];
}
export class ParcoursBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ParcoursEventDto)
  evenements: ParcoursEventDto[];
}
