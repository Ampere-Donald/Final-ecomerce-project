// Explicit customer projection. A historical order is not a source of current
// stock/prices, and nested catalogue records must never reveal purchase costs.
function pick(value: any, fields: string[]) {
  return Object.fromEntries(
    fields
      .filter((key) => value?.[key] !== undefined)
      .map((key) => [key, value[key]]),
  );
}
export function customerOrder(order: any) {
  if (!order) return order;
  return {
    ...pick(order, [
      'id',
      'numeroSuivi',
      'nomClient',
      'telephone',
      'adresseLivraison',
      'montantTotal',
      'statut',
      'dateCommande',
      'dateLivraison',
      'dateConfirmation',
      'dateAnnulation',
      'version',
      'clientId',
      'modeReception',
    ]),
    lignes: (order.lignes || []).map((line: any) => ({
      ...pick(line, [
        'id',
        'commandeId',
        'produitId',
        'nomProduit',
        'quantite',
        'prixUnitaire',
        'sousTotal',
        'version',
      ]),
      produit: line.produit
        ? pick(line.produit, [
            'id',
            'nomProduit',
            'designationEn',
            'code',
            'codeFamille',
            'marque',
            'imageUrl',
            'imageUrl2',
            'imageUrl3',
            'categorieId',
          ])
        : null,
    })),
  };
}
