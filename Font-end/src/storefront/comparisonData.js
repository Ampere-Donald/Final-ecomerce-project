import { adaptProduct } from "./productData.js";

export const COMPARISON_KEY = "newoteg_comparison_v1";
export const EMPTY_COMPARISON = Object.freeze({ categoryId: "", ids: [] });
const identifier = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export function parseComparison(text) {
  try {
    const value = JSON.parse(text);
    if (
      value?.schema !== 1 ||
      !identifier(value.categoryId) ||
      !Array.isArray(value.ids) ||
      value.ids.length < 1 ||
      value.ids.length > 3 ||
      !value.ids.every(identifier) ||
      new Set(value.ids).size !== value.ids.length
    )
      return EMPTY_COMPARISON;
    return { categoryId: value.categoryId, ids: value.ids };
  } catch {
    return EMPTY_COMPARISON;
  }
}

export function toggleComparison(selection, product) {
  if (!identifier(product?.id)) return { selection, error: "unknown" };
  if (selection.ids.includes(product.id)) {
    const ids = selection.ids.filter((id) => id !== product.id);
    return {
      selection: ids.length ? { ...selection, ids } : EMPTY_COMPARISON,
      error: null,
    };
  }
  if (!identifier(product.categoryId)) return { selection, error: "unknown" };
  if (selection.ids.length && selection.categoryId !== product.categoryId)
    return { selection, error: "family" };
  if (selection.ids.length === 3) return { selection, error: "limit" };
  return {
    selection: {
      categoryId: product.categoryId,
      ids: [...selection.ids, product.id],
    },
    error: null,
  };
}

export function comparisonProduct(raw, expectedId, categoryId, resolveImage) {
  if (
    !raw ||
    raw.id !== expectedId ||
    raw.estActif !== true ||
    typeof raw.nomProduit !== "string" ||
    !raw.nomProduit.trim()
  )
    return { error: "unavailable" };
  if ((raw.categorieId || raw.categorie?.id) !== categoryId)
    return { error: "family" };
  if (
    raw.attributs != null &&
    (!Array.isArray(raw.attributs) ||
      raw.attributs.some(
        (attribute) =>
          typeof attribute?.nomAttribut !== "string" ||
          !Array.isArray(attribute.valeurs) ||
          attribute.valeurs.some(
            (value) => !["string", "number"].includes(typeof value?.valeur),
          ),
      ))
  )
    return { error: "invalid" };
  return { product: adaptProduct(raw, resolveImage) };
}

// Preserve exact attribute labels and units. Missing values never prove equality or a difference.
export function comparisonRows(products) {
  const columns = products.map((product) => {
    const map = new Map();
    for (const [label, value] of product.attributes || []) {
      const key = label.trim(),
        text = String(value).trim();
      if (!key || !text) continue;
      map.set(key, [...new Set([...(map.get(key) || []), text])]);
    }
    return map;
  });
  const labels = [...new Set(columns.flatMap((column) => [...column.keys()]))];
  return labels.map((label) => {
    const values = columns.map(
      (column) => column.get(label)?.join(" ; ") || null,
    );
    const complete = values.every((value) => value !== null);
    return {
      label,
      values,
      incomplete: !complete,
      different: complete && new Set(values).size > 1,
    };
  });
}
