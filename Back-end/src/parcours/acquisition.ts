import { BadRequestException } from '@nestjs/common';

export const ACQUISITION_CHANNELS = [
  'RECHERCHE_NATURELLE', 'CAMPAGNE_PAYANTE', 'SOCIAL', 'SITE_REFERENT', 'DIRECT_OU_INCONNU',
] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];
export function acquisitionChannel(value: unknown): AcquisitionChannel | undefined {
  if (value === undefined || value === null) return undefined;
  if (!ACQUISITION_CHANNELS.includes(value as AcquisitionChannel)) throw new BadRequestException('Origine de parcours invalide.');
  return value as AcquisitionChannel;
}
