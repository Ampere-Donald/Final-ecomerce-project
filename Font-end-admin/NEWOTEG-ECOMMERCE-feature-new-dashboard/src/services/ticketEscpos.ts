// -----------------------------------------------------------------------------
// Construction du ticket en commandes ESC/POS (langage natif de l'Epson).
//
// Largeur 32 colonnes (= présentation de référence validée, sans coupure).
// Le modèle 'epson-tm-t20ii' choisit le bon codepage pour les accents.
//
// Règles apprises des tests réels :
//   1. Montants formatés à la main avec ESPACE NORMALE — Intl.NumberFormat('fr')
//      insère U+202F (espace insécable étroite) absente du codepage → « ? ».
//   2. Lignes « libellé .... montant » composées à la main (espaces internes,
//      qui survivent au retour-à-la-ligne de la lib → alignement droite fiable).
//   3. Le centrage utilise la commande align('center'). MAIS la TOUTE PREMIÈRE
//      ligne imprimée perd le centrage (NEWOTEG restait collé à gauche). On émet
//      donc une ligne vide en tête pour « réveiller » l'imprimante : le nom
//      devient la 2e ligne et se centre normalement, en gardant le gras.
//
//   NOTE : largeur fixée à 32 pour éviter toute coupure (l'imprimante fait moins
//   de 48 colonnes). Un « test-règle » donnera la largeur exacte si l'on veut un
//   jour remplir le petit vide à droite.
// -----------------------------------------------------------------------------

import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { brand } from '../config/brand';

export interface TicketLigne {
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface TicketData {
  lignes: TicketLigne[];
  montantTotal: number;
  methodePaiement: string;
  numero: string;
  client?: { nom: string; telephone?: string } | null;
  dateVente?: string;
}

const COLUMNS = 32; // Epson TM-T20II, papier 58 mm.

// Séparateur de milliers = espace ASCII normale (imprimable).
const fmt = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const fmtDateTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Compose « gauche ........ montant » sur `width` colonnes (espaces internes).
function row(left: string, right: string, width = COLUMNS): string[] {
  const gap = width - left.length - right.length;
  if (gap >= 1) return [left + ' '.repeat(gap) + right];
  return [left, ' '.repeat(Math.max(0, width - right.length)) + right];
}

export function buildTicketEscPos(data: TicketData): Uint8Array {
  const { lignes, montantTotal, methodePaiement, numero, client, dateVente } = data;

  const enc: any = new ReceiptPrinterEncoder({
    printerModel: 'epson-tm-t20ii',
    columns: COLUMNS,
    feedBeforeCut: 3,
  });

  enc.initialize();

  // Ligne vide en tête : la 1re ligne de l'Epson perd le centrage. En la
  // sacrifiant, NEWOTEG devient la 2e ligne et se centre correctement.
  enc.newline();

  // ── En-tête centré ; NEWOTEG en gras, TAILLE NORMALE (police d'origine) ──
  enc.align('center');
  enc.bold(true).line(brand.legalName).bold(false);
  enc.line(brand.branchName);
  enc.line(brand.branchDescription);
  enc.line(brand.city);
  enc.line('Tel: ' + brand.phone);
  enc.rule();

  // ── Date + numéro (gauche) ──
  enc.align('left');
  enc.line(fmtDateTime(dateVente));
  enc.line('No: ' + numero);

  // ── Client (optionnel) ──
  if (client?.nom) {
    enc.line('Client: ' + client.nom);
    if (client.telephone) enc.line('Tel: ' + client.telephone);
  }
  enc.rule();

  // ── Lignes : nom (+ qté) à gauche, montant à droite, même ligne ──
  for (const l of lignes) {
    for (const ln of row(`${l.nomProduit} x${l.quantite}`, fmt(l.sousTotal))) enc.line(ln);
  }
  enc.rule();

  // ── Total (gras, ligne alignée gauche → pas de souci de centrage) ──
  enc.bold(true);
  for (const ln of row('TOTAL', `${fmt(montantTotal)} FCFA`)) enc.line(ln);
  enc.bold(false);

  // ── Paiement ──
  enc.newline().line('Paiement: ' + methodePaiement);

  // ── Pied centré ──
  enc.newline().align('center').line('Merci pour votre achat !');
  enc.newline();

  enc.cut();

  return enc.encode();
}
