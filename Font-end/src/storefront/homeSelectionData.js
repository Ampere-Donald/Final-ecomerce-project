import { stockState } from "./productData.js";
const names = {
  connect: ["cables & connectique"],
  power: ["alimentation & energie", "chargeurs & power banks", "piles & batteries"],
  tools: ["mesure & test", "outillage"],
  repair: ["composants electroniques"],
};
const normalize = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function selectionPaths(filter, categories, limit = 5) {
  if (!filter) return ["/produits/populaires"];
  if (!names[filter]) throw Error("Unknown selection filter");
  if (!Array.isArray(categories)) throw Error("Invalid categories");
  return categories.filter((c) => names[filter].includes(normalize(c.nom)))
    .map((c) => "/produits?limit=" + Math.min(20, limit) + "&sort=price_desc&categoryId=" + encodeURIComponent(c.id));
}
export function selectionRows(responses, limit = 5) {
  const rows = responses.flatMap((r) => Array.isArray(r) ? r : r?.data);
  if (rows.some((r) => !r || typeof r.id !== "string" || typeof r.nomProduit !== "string" || r.estActif !== true)) throw Error("Invalid selection");
  const batches = responses.map(r => Array.isArray(r) ? r : r.data);
  const merged = new Map();
  for (let i = 0; i < Math.max(0, ...batches.map(b => b.length)); i++)
    for (const batch of batches) if (batch[i] && !merged.has(batch[i].id)) merged.set(batch[i].id, batch[i]);
  return [...merged.values()].slice(0, Math.min(20, limit));
}
export function selectionAction(product) {
  return stockState(product) === "out" ? {
    equivalent: true,
    to: "/equivalences?" + new URLSearchParams({ query: product.reference || product.model, produitId: product.id }),
  } : { equivalent: false, to: "/product/" + product.id };
}
export function selectionPrice(product, now = Date.now()) {
  // A cached offer price is no longer authoritative after its server deadline.
  // Do not substitute the catalogue tariff; the detail page re-reads the API.
  if (product.offer && Date.parse(product.offer.end) <= now) return null;
  return typeof product.retailPrice === "number" && Number.isFinite(product.retailPrice) && product.retailPrice > 0 ? product.retailPrice : null;
}
