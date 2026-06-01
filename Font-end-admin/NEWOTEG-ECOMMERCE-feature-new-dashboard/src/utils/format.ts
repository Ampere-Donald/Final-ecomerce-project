/**
 * Helpers de formatage cohérents en français pour NEWOTEG.
 * À utiliser PARTOUT en remplacement de toLocaleString()/concat 'FCFA' bruts.
 */

const NB_FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const NB_FMT_DEC = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DATE_LONG = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const DATE_COURT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const DATE_HEURE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const toNum = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
};

/** `1 234 567 FCFA` (entier, espace insécable). Retourne `— FCFA` si null. */
export const fmtFCFA = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '— FCFA';
  return NB_FMT.format(Math.round(toNum(value))).replace(/\s/g, ' ') + ' FCFA';
};

/** Comme fmtFCFA mais avec 2 décimales. */
export const fmtFCFADecimal = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '— FCFA';
  return NB_FMT_DEC.format(toNum(value)).replace(/\s/g, ' ') + ' FCFA';
};

/** `1 234` (entier formaté). */
export const fmtNb = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—';
  return NB_FMT.format(Math.round(toNum(value))).replace(/\s/g, ' ');
};

/** `30 mai 2026`. */
export const fmtDateLong = (value: Date | string | null | undefined): string => {
  const d = toDate(value);
  return d ? DATE_LONG.format(d) : '—';
};

/** `30/05/2026`. */
export const fmtDateCourt = (value: Date | string | null | undefined): string => {
  const d = toDate(value);
  return d ? DATE_COURT.format(d) : '—';
};

/** `19h30` (24h). */
export const fmtHeure = (value: Date | string | null | undefined): string => {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(':', 'h');
};

/** `30/05/2026 — 19h30`. */
export const fmtDateHeure = (value: Date | string | null | undefined): string => {
  const d = toDate(value);
  if (!d) return '—';
  return DATE_HEURE.format(d).replace(/(\d{2}):(\d{2})$/, '$1h$2');
};

/**
 * Renvoie `il y a 3 jours`, `dans 2 heures`, `maintenant`…
 * Pour les écarts < 1 min : "à l'instant".
 */
export const fmtRelatif = (value: Date | string | null | undefined): string => {
  const d = toDate(value);
  if (!d) return '—';
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;
  const fmt = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (abs < 60_000) return past ? "à l'instant" : 'maintenant';
  if (abs < 3_600_000) return fmt.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return fmt.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 30 * 86_400_000) return fmt.format(Math.round(diff / 86_400_000), 'day');
  if (abs < 365 * 86_400_000) return fmt.format(Math.round(diff / (30 * 86_400_000)), 'month');
  return fmt.format(Math.round(diff / (365 * 86_400_000)), 'year');
};

/** Nombre de jours entre aujourd'hui et `date` (positif si futur). */
export const joursAvant = (value: Date | string | null | undefined): number => {
  const d = toDate(value);
  if (!d) return 0;
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const n = new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((t - today) / 86_400_000);
};

/** Convertit n'importe quelle valeur en nombre sûr (0 si invalide). */
export { toNum };
