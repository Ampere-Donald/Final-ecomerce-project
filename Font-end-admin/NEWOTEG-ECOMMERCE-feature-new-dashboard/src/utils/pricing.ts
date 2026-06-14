/**
 * Prix variable par bornes selon le rôle — miroir client de Back-end/src/pricing/pricing.util.ts.
 * Sert l'UX (champ borné, couleurs, motif). Le serveur reste l'autorité.
 */

export type Bande = 'PLEIN' | 'VERTE' | 'JAUNE' | 'ROUGE' | 'PERTE';

export interface Bornes {
  min: number;
  max: number | null;
}

export interface ProduitPrix {
  prixGros?: number | null;
  prixDemiGros?: number | null;
  prixDetail?: number | null;
  cmupActuel?: number | null;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function bornesPrix(
  produit: ProduitPrix,
  role?: string,
  peutVendreSousDemiGros = false,
): Bornes {
  const gros = num(produit.prixGros);
  const demiGros = produit.prixDemiGros != null ? num(produit.prixDemiGros) : gros;

  if (role === 'SUPER_ADMIN') return { min: 0, max: null };
  if (role === 'ADMIN' && peutVendreSousDemiGros) return { min: gros + 1, max: null };
  return { min: demiGros, max: null };
}

export function classerBande(prix: number, produit: ProduitPrix): Bande {
  const gros = num(produit.prixGros);
  const demiGros = produit.prixDemiGros != null ? num(produit.prixDemiGros) : gros;
  const detail = produit.prixDetail != null ? num(produit.prixDetail) : demiGros;
  const cmup = num(produit.cmupActuel);

  if (cmup > 0 && prix < cmup) return 'PERTE';
  if (gros > 0 && prix <= gros) return 'ROUGE';
  if (prix < demiGros) return 'JAUNE';
  if (prix < detail) return 'VERTE';
  return 'PLEIN';
}

export function exigeMotif(prix: number, produit: ProduitPrix): boolean {
  if (produit.prixDetail == null) return false;
  return prix < num(produit.prixDetail);
}

/** Classe Tailwind de couleur de bordure/texte selon la bande, pour le champ prix. */
export const BANDE_STYLE: Record<Bande, string> = {
  PLEIN: 'border-slate-200 text-slate-900',
  VERTE: 'border-emerald-300 text-emerald-700 bg-emerald-50',
  JAUNE: 'border-amber-300 text-amber-700 bg-amber-50',
  ROUGE: 'border-red-300 text-red-700 bg-red-50',
  PERTE: 'border-red-500 text-red-800 bg-red-100',
};
