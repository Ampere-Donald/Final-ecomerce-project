import { stockState } from "./productData.js";
const names = {
  connect: ["cables & connectique"],
  power: ["alimentation & energie", "chargeurs & power banks", "piles & batteries"],
  tools: ["mesure & test", "outillage"],
  repair: ["composants electroniques"],
};
const normalize = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function selectionPaths(filter, categories) {
  if (!filter) return ["/produits/populaires"];
  if (!names[filter]) throw Error("Unknown selection filter");
  if (!Array.isArray(categories)) throw Error("Invalid categories");
  return categories.filter((c) => names[filter].includes(normalize(c.nom)))
    .map((c) => "/produits?limit=5&categoryId=" + encodeURIComponent(c.id));
}
export function selectionRows(responses) {
  const rows = responses.flatMap((r) => Array.isArray(r) ? r : r?.data);
  if (rows.some((r) => !r || typeof r.id !== "string" || typeof r.nomProduit !== "string" || r.estActif !== true)) throw Error("Invalid selection");
  return [...new Map(rows.map((r) => [r.id, r])).values()].slice(0, 5);
}
export function selectionAction(product) {
  return stockState(product) === "out" ? {
    equivalent: true,
    to: "/equivalences?" + new URLSearchParams({ query: product.reference || product.model, produitId: product.id }),
  } : { equivalent: false, to: "/product/" + product.id };
}
export function selectionPrice(product) {
  return typeof product.retailPrice === "number" && Number.isFinite(product.retailPrice) && product.retailPrice > 0 ? product.retailPrice : null;
}
