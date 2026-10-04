import api from './api';

export const events = [
  'RECHERCHE_VIDE',
  'FICHE_OUVERTE',
  'AJOUT_PANIER',
  'FRAIS_VUS',
  'SORTIE_APRES_FRAIS',
  'REACHAT_AJOUTE',
  'WHATSAPP_OUVERT',
] as const;
export type Event = (typeof events)[number];
export type Reception = 'GENERAL' | 'RETRAIT' | 'LIVRAISON_A_CONFIRMER' | 'LIVRAISON_CALCULEE';
export type Period = { debut: string; fin: string };
export type Observation = {
  jour: string;
  evenement: Event;
  langue: 'fr' | 'en';
  appareil: 'mobile' | 'tablette' | 'ordinateur';
  reception: Reception;
  nombre: number;
};
export type Report = Period & {
  actif: boolean;
  fuseau: 'Africa/Douala';
  jourEnCours: boolean;
  observations: Observation[];
  activite: {
    commandesSansProvenance: number;
    commandesEnregistrees: number;
    devisDemandes: number;
    livraisonsPeriode: number;
    retraitsPeriode: number;
  };
  cohorte: {
    commandesEnregistrees: number;
    livrees: number;
    retirees: number;
    tauxReception: number | null;
  };
  retoursIncompatibilite:
    | { disponible: false; nombre: null }
    | {
        disponible: true;
        nombre: number;
        articles: number;
        signalements: number;
      };
};
const dayMs = 86400000;
export function doualaToday(now = new Date()) {
  return new Date(now.getTime() + 3600000).toISOString().slice(0, 10);
}
function dateMs(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Date invalide');
  const date = new Date(value + 'T00:00:00Z');
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 1 ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error('Date invalide');
  return date.getTime();
}
function dateAt(ms: number) {
  const date = new Date(ms);
  if (date.getUTCFullYear() < 1) throw new Error('Période précédente hors calendrier');
  return date.toISOString().slice(0, 10);
}
export function comparablePeriods(period: Period, now = new Date()) {
  const start = dateMs(period.debut),
    end = dateMs(period.fin);
  const days = (end - start) / dayMs + 1;
  if (days < 1 || days > 90 || period.fin > doualaToday(now))
    throw new Error('Choisissez de 1 à 90 jours, sans date future.');
  return {
    selected: { ...period },
    previous: {
      debut: dateAt(start - days * dayMs),
      fin: dateAt(start - dayMs),
    },
    days,
  };
}
export function defaultPeriod(now = new Date()): Period {
  const today = dateMs(doualaToday(now));
  return { debut: dateAt(today - 7 * dayMs), fin: dateAt(today - dayMs) };
}
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error('Rapport invalide');
  return value as Record<string, unknown>;
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('Compteur invalide');
  return value;
}
function sum(a: number, b: number) {
  return count(a + b);
}
export function parseReport(value: unknown, expected: Period): Report {
  const report = object(value, [
    'actif',
    'debut',
    'fin',
    'fuseau',
    'jourEnCours',
    'observations',
    'activite',
    'cohorte',
    'retoursIncompatibilite',
  ]);
  if (
    report.debut !== expected.debut ||
    report.fin !== expected.fin ||
    report.fuseau !== 'Africa/Douala' ||
    typeof report.actif !== 'boolean' ||
    typeof report.jourEnCours !== 'boolean' ||
    !Array.isArray(report.observations)
  )
    throw new Error('Rapport invalide');
  dateMs(expected.debut);
  dateMs(expected.fin);
  const seen = new Set<string>();
  const observations = report.observations.map((value) => {
    const cell = object(value, ['jour', 'evenement', 'langue', 'appareil', 'reception', 'nombre']);
    if (
      typeof cell.jour !== 'string' ||
      cell.jour < expected.debut ||
      cell.jour > expected.fin ||
      !events.includes(cell.evenement as Event) ||
      !['fr', 'en'].includes(String(cell.langue)) ||
      !['mobile', 'tablette', 'ordinateur'].includes(String(cell.appareil)) ||
      !['GENERAL', 'RETRAIT', 'LIVRAISON_A_CONFIRMER', 'LIVRAISON_CALCULEE'].includes(
        String(cell.reception),
      )
    )
      throw new Error('Observation invalide');
    dateMs(cell.jour);
    const fee = cell.evenement === 'FRAIS_VUS' || cell.evenement === 'SORTIE_APRES_FRAIS';
    if (fee === (cell.reception === 'GENERAL') || !count(cell.nombre))
      throw new Error('Observation invalide');
    const key = [cell.jour, cell.evenement, cell.langue, cell.appareil, cell.reception].join(':');
    if (seen.has(key)) throw new Error('Observation dupliquée');
    seen.add(key);
    return { ...cell } as Observation;
  });
  const activity = object(report.activite, [
    'commandesSansProvenance',
    'commandesEnregistrees',
    'devisDemandes',
    'livraisonsPeriode',
    'retraitsPeriode',
  ]);
  const activite = {
    commandesSansProvenance: count(activity.commandesSansProvenance),
    commandesEnregistrees: count(activity.commandesEnregistrees),
    devisDemandes: count(activity.devisDemandes),
    livraisonsPeriode: count(activity.livraisonsPeriode),
    retraitsPeriode: count(activity.retraitsPeriode),
  };
  const cohort = object(report.cohorte, [
    'commandesEnregistrees',
    'livrees',
    'retirees',
    'tauxReception',
  ]);
  const created = count(cohort.commandesEnregistrees),
    delivered = count(cohort.livrees),
    collected = count(cohort.retirees);
  const received = sum(delivered, collected);
  if (
    created !== activite.commandesEnregistrees ||
    received > created ||
    (created === 0
      ? cohort.tauxReception !== null
      : typeof cohort.tauxReception !== 'number' ||
        !Number.isFinite(cohort.tauxReception) ||
        Math.abs(cohort.tauxReception - received / created) > 1e-10)
  )
    throw new Error('Cohorte invalide');
  const registryAvailable = (report.retoursIncompatibilite as { disponible?: unknown } | null)
    ?.disponible;
  let registry: Report['retoursIncompatibilite'];
  if (registryAvailable === true) {
    const returns = object(report.retoursIncompatibilite, [
      'disponible',
      'nombre',
      'articles',
      'signalements',
    ]);
    registry = {
      disponible: true,
      nombre: count(returns.nombre),
      articles: count(returns.articles),
      signalements: count(returns.signalements),
    };
    if (registry.articles < registry.nombre || (registry.nombre === 0 && registry.articles !== 0))
      throw new Error('Quantités de retour incohérentes');
  } else {
    const returns = object(report.retoursIncompatibilite, ['disponible', 'nombre']);
    if (returns.disponible !== false || returns.nombre !== null)
      throw new Error('Registre non pris en charge');
    registry = { disponible: false, nombre: null };
  }
  const result: Report = {
    ...expected,
    actif: report.actif,
    fuseau: 'Africa/Douala',
    jourEnCours: report.jourEnCours,
    observations,
    activite,
    cohorte: {
      commandesEnregistrees: created,
      livrees: delivered,
      retirees: collected,
      tauxReception: cohort.tauxReception as number | null,
    },
    retoursIncompatibilite: registry,
  };
  // Refuse an aggregate overflow rather than render rounded or misleading counts.
  observationTotals(result);
  return result;
}
export function observationTotals(report: Report) {
  const totals = Object.fromEntries(events.map((event) => [event, 0])) as Record<Event, number>;
  for (const cell of report.observations)
    totals[cell.evenement] = sum(totals[cell.evenement], cell.nombre);
  return totals;
}
export async function loadComparison(period: Period, signal: AbortSignal) {
  const periods = comparablePeriods(period);
  const read = async (range: Period) => {
    const response = await api.get('/parcours/rapport', {
      params: range,
      signal,
      timeout: 15000,
    });
    return parseReport(response.data, range);
  };
  const [previous, selected] = await Promise.all([read(periods.previous), read(periods.selected)]);
  return { previous, selected, days: periods.days };
}
