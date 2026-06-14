/**
 * Prix variable par bornes selon le rôle.
 *
 * Échelle des prix (du plus bas au plus haut) :
 *   prix GROS  <  prix DEMI-GROS  <  prix DÉTAIL  <  (ouvert vers le haut)
 *
 * Bandes :
 *   🟢 VERTE  [demi-gros, +∞[   → vendeur, admin, super admin
 *   🟡 JAUNE  ]gros, demi-gros[ → admin AUTORISÉ + super admin
 *   🔴 ROUGE  ]−∞, gros]        → super admin uniquement
 *
 * Vraie perte = prix < cmupActuel.
 *
 * Source de vérité unique : utilisée côté serveur (validation) et reflétée côté client (UX).
 */

export type Bande = 'PLEIN' | 'VERTE' | 'JAUNE' | 'ROUGE' | 'PERTE';

export type RolePricing = 'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'VENDEUR' | 'MANAGER';

export interface Bornes {
  /** Prix minimum autorisé (inclus). */
  min: number;
  /** Prix maximum autorisé, `null` = ouvert (pas de plafond). */
  max: number | null;
}

export interface ProduitPrix {
  prixGros?: number | null;
  prixDemiGros?: number | null;
  prixDetail?: number | null;
}

export interface ProduitPrixComplet extends ProduitPrix {
  cmupActuel?: number | null;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Calcule l'intervalle de prix autorisé pour un rôle donné sur un produit.
 *
 * @param produit prix de référence du produit (gros / demi-gros / détail)
 * @param role rôle de la personne qui vend
 * @param peutVendreSousDemiGros flag d'autorisation (admin uniquement)
 */
export function bornesPrix(
  produit: ProduitPrix,
  role: RolePricing | string | undefined,
  peutVendreSousDemiGros = false,
): Bornes {
  const gros = num(produit.prixGros);
  // Fallback : si le demi-gros n'est pas renseigné, on retombe sur le gros.
  const demiGros = produit.prixDemiGros != null ? num(produit.prixDemiGros) : gros;

  // Super admin : aucune limite, peut vendre à perte.
  if (role === 'SUPER_ADMIN') return { min: 0, max: null };

  // Admin autorisé : bande jaune, mais jamais le prix de gros (réservé super admin).
  if (role === 'ADMIN' && peutVendreSousDemiGros) {
    return { min: gros + 1, max: null };
  }

  // Bande verte : admin non autorisé, vendeur, etc.
  return { min: demiGros, max: null };
}

/**
 * Classe un prix de vente dans une bande, pour l'audit et l'alerte.
 */
export function classerBande(prix: number, produit: ProduitPrixComplet): Bande {
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

/** Une vente sous le prix de détail constitue une remise → motif requis. */
export function exigeMotif(prix: number, produit: ProduitPrix): boolean {
  if (produit.prixDetail == null) return false;
  return prix < num(produit.prixDetail);
}

// ── Validation serveur (réutilisée par bon-vente / ticket-vente / vente) ──────

export interface LignePrixContext {
  produit: ProduitPrixComplet & { nomProduit?: string };
  prix: number;
  role: RolePricing | string | undefined;
  peutVendreSousDemiGros: boolean;
  motif?: string | null;
}

export interface LignePrixResult {
  prixReference: number | null;
  bandePrix: Bande;
  motifRemise: string | null;
}

/**
 * Valide un prix de ligne contre les bornes du rôle et renvoie les champs d'audit.
 * Lève une exception NestJS si le prix est hors bornes ou si un motif manque.
 *
 * Les exceptions sont importées dynamiquement pour garder ce fichier utilisable
 * côté tests sans dépendance Nest au chargement.
 */
export function validerLignePrix(ctx: LignePrixContext): LignePrixResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { BadRequestException, ForbiddenException } = require('@nestjs/common');
  const { produit, prix, role, peutVendreSousDemiGros } = ctx;

  const bornes = bornesPrix(produit, role, peutVendreSousDemiGros);
  const nom = produit.nomProduit ?? 'ce produit';

  if (prix < bornes.min) {
    throw new ForbiddenException(
      `Prix ${prix} FCFA inférieur au minimum autorisé (${bornes.min} FCFA) pour ${nom}.`,
    );
  }
  if (bornes.max != null && prix > bornes.max) {
    throw new ForbiddenException(
      `Prix ${prix} FCFA supérieur au maximum autorisé pour ${nom}.`,
    );
  }

  const motif = (ctx.motif ?? '').trim();
  if (exigeMotif(prix, produit) && !motif) {
    throw new BadRequestException(
      `Un motif est requis pour vendre ${nom} sous le prix de détail.`,
    );
  }

  return {
    prixReference: produit.prixDetail != null ? num(produit.prixDetail) : null,
    bandePrix: classerBande(prix, produit),
    motifRemise: motif || null,
  };
}
