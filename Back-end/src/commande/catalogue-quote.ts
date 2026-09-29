import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export async function quoteCatalogue(
  db: any,
  requested: { produitId: string; quantite: number }[],
) {
  if (!Array.isArray(requested) || !requested.length || requested.length > 100)
    throw new BadRequestException(
      'Le panier doit contenir entre 1 et 100 références.',
    );
  const seen = new Set();
  const lignes: any[] = [];
  for (const line of requested) {
    if (
      !line?.produitId ||
      seen.has(line.produitId) ||
      !Number.isSafeInteger(line.quantite) ||
      line.quantite < 1
    )
      throw new BadRequestException(
        'Référence dupliquée ou quantité invalide.',
      );
    seen.add(line.produitId);
    const product = await db.produit.findUnique({
      where: { id: line.produitId },
    });
    if (!product || product.estActif === false)
      throw new NotFoundException(
        'Une référence du panier n’est plus disponible.',
      );
    if (
      !Number.isFinite(product.quantiteStock) ||
      product.quantiteStock < line.quantite
    )
      throw new ConflictException({
        code: 'STOCK_CHANGED',
        message: `Stock insuffisant pour « ${product.nomProduit} ». Disponible : ${product.quantiteStock}.`,
      });
    const price = Number(product.prixDetail);
    if (!Number.isFinite(price) || price <= 0)
      throw new ConflictException({
        code: 'PRICE_UNAVAILABLE',
        message: `Le prix de « ${product.nomProduit} » doit être confirmé par la boutique.`,
      });
    const cents = Math.round(price * 100);
    const subtotal = cents * line.quantite;
    if (!Number.isSafeInteger(subtotal))
      throw new BadRequestException('Montant invalide.');
    lignes.push({
      produitId: product.id,
      nomProduit: product.nomProduit,
      quantite: line.quantite,
      prixUnitaire: cents / 100,
      sousTotal: subtotal / 100,
    });
  }
  const montantArticles =
    lignes.reduce((sum, line) => sum + Math.round(line.sousTotal * 100), 0) /
    100;
  return { lignes, montantArticles, fraisLivraison: null, requestProtocol: 1 };
}

export function assertQuoteAccepted(
  dto: any,
  quote: Awaited<ReturnType<typeof quoteCatalogue>>,
) {
  const changed =
    Number(dto.montantTotal) !== quote.montantArticles ||
    dto.lignes.some(
      (line: any, i: number) =>
        Number(line.prixUnitaire) !== quote.lignes[i].prixUnitaire,
    );
  if (changed)
    throw new ConflictException({
      code: 'PRICE_CHANGED',
      message:
        'Les tarifs ont changé. Vérifiez le nouveau récapitulatif avant de confirmer.',
      quote,
    });
}
