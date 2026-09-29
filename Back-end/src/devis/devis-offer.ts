import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

// Prices and totals must fit their database columns without rounding an offer.
export function offerCents(value: unknown, max = 999999999999): number {
  try {
    const decimal = new Prisma.Decimal(String(value));
    const cents = decimal.mul(100);
    if (
      !decimal.isFinite() ||
      !cents.isInteger() ||
      cents.lte(0) ||
      cents.gt(max)
    )
      throw new Error();
    return cents.toNumber();
  } catch {
    throw new BadRequestException(
      "Vérifiez les montants du devis, limités à deux décimales.",
    );
  }
}

/** Canonical commercial terms; deliberately excludes transient stock and private fields. */
export function snapshotProforma(proforma: any) {
  const expiration = new Date(proforma?.dateExpiration);
  if (
    !proforma?.numero ||
    !Number.isFinite(expiration.getTime()) ||
    !Array.isArray(proforma.lignes) ||
    !proforma.lignes.length ||
    proforma.lignes.length > 50
  ) {
    throw new BadRequestException("La proposition est incomplète.");
  }
  const ids = new Set<string>();
  let total = 0;
  const lignes = proforma.lignes
    .map((line: any) => {
      if (
        typeof line.produitId !== "string" ||
        !line.produitId ||
        ids.has(line.produitId) ||
        typeof line.nomProduit !== "string" ||
        !line.nomProduit.trim() ||
        line.nomProduit.length > 150 ||
        !Number.isSafeInteger(line.quantite) ||
        line.quantite < 1 ||
        line.quantite > 100000
      ) {
        throw new BadRequestException(
          "Vérifiez les références et quantités du devis.",
        );
      }
      ids.add(line.produitId);
      const price = offerCents(line.prixUnitaire, 9999999999);
      const subtotal = offerCents(line.sousTotal);
      if (subtotal !== price * line.quantite)
        throw new BadRequestException("Le sous-total du devis est incohérent.");
      total += subtotal;
      if (total > 999999999999)
        throw new BadRequestException(
          "Le total du devis dépasse le montant accepté.",
        );
      return {
        produitId: line.produitId,
        nomProduit: line.nomProduit,
        quantite: line.quantite,
        prixUnitaire: price / 100,
        sousTotal: subtotal / 100,
      };
    })
    .sort((a: any, b: any) => a.produitId.localeCompare(b.produitId));
  if (total !== offerCents(proforma.montantTotal))
    throw new BadRequestException(
      "Le total de la proforma ne correspond pas à ses lignes.",
    );
  return {
    numero: proforma.numero,
    dateExpiration: expiration.toISOString(),
    montantArticles: total / 100,
    fraisLivraison: null,
    reservationStock: false,
    lignes,
  };
}

export function offerMatches(
  snapshot: any,
  live: ReturnType<typeof snapshotProforma>,
) {
  try {
    if (
      snapshot?.fraisLivraison !== null ||
      snapshot?.reservationStock !== false
    )
      return false;
    return (
      JSON.stringify(
        snapshotProforma({
          ...snapshot,
          montantTotal: snapshot.montantArticles,
        }),
      ) === JSON.stringify(live)
    );
  } catch {
    return false;
  }
}
