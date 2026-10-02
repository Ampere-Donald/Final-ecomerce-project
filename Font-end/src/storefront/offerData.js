export function readOffer(raw) {
  const o = raw?.offre;
  if (!o) return null;
  const amount = (v) =>
    typeof v === "number" &&
    Number.isFinite(v) &&
    v > 0 &&
    Number.isSafeInteger(Math.round(v * 100));
  if (
    !amount(o.prixCatalogue) ||
    !amount(o.prixOffre) ||
    o.prixOffre >= o.prixCatalogue ||
    raw.prixPublic !== o.prixOffre ||
    typeof o.fin !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(o.fin) ||
    !Number.isFinite(Date.parse(o.fin))
  )
    throw Error("Invalid public offer");
  return { cataloguePrice: o.prixCatalogue, price: o.prixOffre, end: o.fin };
}
export function readMerchandising(data, mode) {
  if (
    !Array.isArray(data) ||
    data.length > 20 ||
    new Set(data.map((p) => p?.id)).size !== data.length
  )
    throw Error("Invalid merchandising list");
  return data.map((p) => {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      typeof p.nomProduit !== "string" ||
      p.estActif !== true ||
      !Number.isSafeInteger(p.quantiteStock) ||
      p.quantiteStock <= 0
    )
      throw Error("Invalid merchandising product");
    if (mode === "offres" && !readOffer(p)) throw Error("Missing public offer");
    if (
      mode === "arrivages" &&
      (typeof p.arrivageAt !== "string" ||
        !Number.isFinite(Date.parse(p.arrivageAt)))
    )
      throw Error("Missing arrival date");
    return p;
  });
}
