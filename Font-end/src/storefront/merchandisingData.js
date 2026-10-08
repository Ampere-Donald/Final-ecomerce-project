import { adaptProduct, stockState } from "./productData.js";
export const normalizeCategory = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const category = (name, search = "", limit = 10) => ({ category: name, search, limit });
const categoryEnglish = {
  "Composants Électroniques": "Electronic components",
  "Audio & Son": "Audio & sound",
  "Satellite & TV": "Satellite & TV",
  "Alimentation & Energie": "Power & energy",
  "Chargeurs & Power Banks": "Chargers & power banks",
  "Piles & Batteries": "Batteries",
  "Câbles & Connectique": "Cables & connectors",
  "Mesure & Test": "Measurement & testing",
  "Outillage": "Tools",
};
export const categoryLabel = (name, lang) => lang === "en" ? categoryEnglish[name] || name : name;
export const homeCollections = [
  { id: "capacitors", order: 1, title: ["Condensateurs pour vos montages", "Capacitors for your circuits"], description: ["Capacités, tensions et formats : retrouvez la référence adaptée.", "Find the capacitance, voltage and format your circuit needs."], sources: [category("Composants Électroniques", "CONDO", 12), category("Composants Électroniques", "condensateur", 12)], link: { category: "Composants Électroniques", search: "cond" }, max: 20 },
  { id: "semiconductors", order: 2, title: ["Circuits intégrés & transistors", "Integrated circuits & transistors"], description: ["Amplification, commande et puissance. Vérifiez le boîtier et le brochage.", "Amplification, control and power. Check the package and pinout."], sources: [category("Composants Électroniques", "TDA", 8), category("Composants Électroniques", "transistor", 8), category("Composants Électroniques", "MOSFET", 8)], link: { category: "Composants Électroniques" }, max: 20 },
  { id: "repair", order: 3, title: ["Pour vos réparations TV et audio", "For TV and audio repairs"], description: ["Cartes, amplification et éclairage : comparez les caractéristiques avant de remplacer.", "Boards, amplification and lighting: compare specifications before replacing a part."], sources: [category("Composants Électroniques", "CARTE MERE TV", 8), category("Audio & Son", "ampli", 8), category("Satellite & TV", "LED", 8)], link: { search: "TV" }, max: 20 },
  { id: "power", order: 4, title: ["Alimentations, chargeurs & batteries", "Power supplies, chargers & batteries"], description: ["Les bonnes tensions pour alimenter vos équipements.", "The right voltage to power your equipment."], sources: [category("Alimentation & Energie", "", 7), category("Chargeurs & Power Banks", "", 7), category("Piles & Batteries", "", 7)], link: { category: "Alimentation & Energie" }, max: 20 },
  { id: "connect", order: 5, title: ["Câbles, connecteurs & adaptateurs", "Cables, connectors & adapters"], description: ["Raccordez vos appareils et préparez vos installations.", "Connect your devices and prepare your installations."], sources: [category("Câbles & Connectique", "", 20)], link: { category: "Câbles & Connectique" }, max: 20 },
  { id: "tools", order: 6, title: ["Outillage, mesure & test", "Tools, measurement & testing"], description: ["Mesurer, souder et assembler avec les accessoires de l’atelier.", "Measure, solder and assemble with workshop essentials."], sources: [category("Mesure & Test", "", 10), category("Outillage", "", 10)], link: { category: "Outillage" }, max: 20 },
];
export function resolveCategory(categories, name) {
  return categories.find((c) => normalizeCategory(c.nom) === normalizeCategory(name));
}
export function collectionPaths(config, categories) {
  if (!Array.isArray(categories)) throw Error("Invalid categories");
  return config.sources.flatMap((source) => {
    const c = resolveCategory(categories, source.category);
    if (!c) return [];
    const params = new URLSearchParams({ categoryId: c.id, limit: String(Math.min(20, source.limit)), page: "1", sort: "price_desc", inStock: "true" });
    if (source.search) params.set("search", source.search);
    return ["/produits?" + params];
  });
}
export function collectionLink(config, categories) {
  const params = new URLSearchParams();
  const c = config.link.category && resolveCategory(categories, config.link.category);
  if (c) params.set("category", c.id);
  if (config.link.search) params.set("search", config.link.search);
  return "/catalogue" + (params.size ? "?" + params : "");
}
// Bounded server samples only. Never download the full inventory to classify it.
export function selectCollection(responses, resolveImage, max = 20) {
  const batches = responses.map((r) => {
    const rows = Array.isArray(r) ? r : r?.data;
    if (!Array.isArray(rows)) throw Error("Invalid collection");
    return rows.filter((p) => p?.estActif === true && typeof p.id === "string" && typeof p.nomProduit === "string").map((p) => adaptProduct(p, resolveImage));
  });
  const rank = p => (p.image ? 4 : 0) + (p.retailPrice > 0 ? 2 : 0) + (["ok", "low"].includes(stockState(p)) ? 1 : 0);
  batches.forEach((rows) => rows.sort((a,b) => rank(b) - rank(a) || a.id.localeCompare(b.id)));
  const merged = new Map();
  const longest = Math.max(0, ...batches.map(b => b.length));
  // Interleave sources to show several families/uses instead of one expensive subset.
  for (let i=0;i<longest;i++) for (const batch of batches) if (batch[i] && !merged.has(batch[i].id)) merged.set(batch[i].id, batch[i]);
  const rows = [...merged.values()].filter(p => ["ok", "low"].includes(stockState(p)));
  const complete = rows.filter(p => p.image && p.retailPrice > 0);
  // Even in a sparsely priced family, show every complete reference before
  // incomplete ones. Never manufacture a price to fill the first five cards.
  const candidates = complete.length >= 5 ? complete : [...complete, ...rows.filter(p => !p.image || !(p.retailPrice > 0))];
  return candidates.slice(0, Math.min(20, max));
}
