/**
 * Conversion d'un montant entier en toutes lettres (français), pour les
 * bulletins de paie. Couvre 0 → 999 999 999, largement suffisant pour un salaire.
 */

const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

const DIZAINES = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante',
  'quatre-vingt', 'quatre-vingt',
];

function dizaines(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) {
    const base = DIZAINES[d];
    if (d === 7 && u === 1) return `${base} et ${UNITES[11]}`; // soixante et onze
    return `${base}-${dizaines(10 + u)}`;
  }
  let s = DIZAINES[d];
  if (d === 8 && u === 0) s += 's'; // quatre-vingts
  if (u === 1 && d >= 2 && d <= 6) return `${s} et ${UNITES[1]}`; // vingt et un…
  if (u > 0) s += `-${UNITES[u]}`;
  return s;
}

function centaines(n: number): string {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let s = '';
  if (c > 0) {
    s += c > 1 ? `${UNITES[c]} cent` : 'cent';
    if (c > 1 && r === 0) s += 's'; // deux cents
    if (r > 0) s += ' ';
  }
  if (r > 0) s += dizaines(r);
  return s;
}

export function montantEnLettres(montant: number | string): string {
  const n = Math.round(Math.abs(Number(montant) || 0));
  if (n === 0) return 'zéro';

  const milliards = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  const parts: string[] = [];
  if (milliards > 0)
    parts.push(`${centaines(milliards)} milliard${milliards > 1 ? 's' : ''}`);
  if (millions > 0)
    parts.push(`${centaines(millions)} million${millions > 1 ? 's' : ''}`);
  if (milliers > 0)
    parts.push(milliers === 1 ? 'mille' : `${centaines(milliers)} mille`);
  if (reste > 0) parts.push(centaines(reste));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
