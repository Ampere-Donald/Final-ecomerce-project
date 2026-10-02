import { BadRequestException } from '@nestjs/common';

/** Web catalogue policy: one detail-unit price, no cumulative volume discount.
 * A stored promotion applies only with a positive lower price and a dated,
 * unexpired end. The base is the current catalogue price, never evidence of
 * a previous sale. Freeze `now` for an entire quote/public response.
 */
export function cataloguePricing(product: any, now = new Date()) {
  const amount = (value: unknown): number | null => {
    if (!['number', 'string'].includes(typeof value) || value === '')
      return null;
    const n = Number(value),
      cents = Math.round(n * 100);
    return Number.isFinite(n) &&
      n > 0 &&
      Number.isSafeInteger(cents) &&
      cents > 0
      ? cents / 100
      : null;
  };
  const base = amount(product?.prixDetail),
    promo = amount(product?.prixPromo);
  const rawEnd = product?.finPromo;
  const end =
    rawEnd instanceof Date
      ? rawEnd
      : typeof rawEnd === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(rawEnd)
        ? new Date(rawEnd)
        : null;
  const applicable =
    product?.estActif !== false &&
    base != null &&
    promo != null &&
    promo < base &&
    end &&
    Number.isFinite(end.getTime()) &&
    end.getTime() > now.getTime();
  return {
    prixPublic: applicable ? promo : base,
    offre: applicable
      ? { prixCatalogue: base, prixOffre: promo, fin: end.toISOString() }
      : null,
  };
}

export function validateCataloguePromotion(product: any) {
  if (product.prixPromo == null || product.prixPromo === 0) return;
  const price = Number(product.prixPromo),
    base = Number(product.prixDetail);
  const end =
    product.finPromo instanceof Date
      ? product.finPromo
      : new Date(product.finPromo || 'invalid');
  if (
    !['number', 'string'].includes(typeof product.prixPromo) ||
    !['number', 'string'].includes(typeof product.prixDetail) ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(base) ||
    base <= price ||
    !Number.isFinite(end.getTime())
  )
    throw new BadRequestException(
      'Une offre exige un prix positif inférieur au prix catalogue et une date de fin valide.',
    );
}
