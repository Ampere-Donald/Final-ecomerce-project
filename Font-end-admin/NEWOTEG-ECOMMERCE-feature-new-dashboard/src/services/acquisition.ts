import api from './api';
import { comparablePeriods, type Period } from './parcours';
export const acquisitionChannels = ['RECHERCHE_NATURELLE', 'CAMPAGNE_PAYANTE', 'SOCIAL', 'SITE_REFERENT', 'DIRECT_OU_INCONNU'] as const;
export type Channel = (typeof acquisitionChannels)[number];
export type AcquisitionRow = { canalEntree: Channel | null; devisDemandes: number; commandesEnregistrees: number; commandesRecues: number };
export type AcquisitionReport = Period & { fuseau: 'Africa/Douala'; canaux: AcquisitionRow[] };
export function parseAcquisitionReport(value: unknown, period: Period): AcquisitionReport {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== 'object' || v.debut !== period.debut || v.fin !== period.fin || v.fuseau !== 'Africa/Douala' || !Array.isArray(v.canaux) || v.canaux.length !== 6) throw Error('Répartition invalide');
  const seen = new Set<unknown>();
  const canaux = v.canaux.map(raw => {
    const row = raw as AcquisitionRow;
    if (!row || Object.keys(row).sort().join(',') !== 'canalEntree,commandesEnregistrees,commandesRecues,devisDemandes' ||
      !(row.canalEntree === null || acquisitionChannels.includes(row.canalEntree)) || seen.has(row.canalEntree) ||
      [row.devisDemandes, row.commandesEnregistrees, row.commandesRecues].some(n => !Number.isSafeInteger(n) || n < 0) ||
      row.commandesRecues > row.commandesEnregistrees) throw Error('Compteurs de répartition invalides');
    seen.add(row.canalEntree);
    return { canalEntree: row.canalEntree, devisDemandes: row.devisDemandes, commandesEnregistrees: row.commandesEnregistrees, commandesRecues: row.commandesRecues };
  });
  return { ...period, fuseau: 'Africa/Douala', canaux };
}
export async function loadAcquisition(period: Period, signal: AbortSignal) {
  comparablePeriods(period);
  const response = await api.get('/parcours/acquisition', { params: { debut: period.debut, fin: period.fin }, signal, timeout: 15000 });
  return parseAcquisitionReport(response.data, period);
}
