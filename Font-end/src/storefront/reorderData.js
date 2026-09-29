import { adaptProduct, canBuy, stockState } from "./productData.js";

// Order lines are historical snapshots, never a source of current availability.
export function reorderLines(lines) {
  const grouped = new Map();
  for (const [index, line] of (lines || []).entries()) {
    const quantity = Number(line.quantite);
    if (!Number.isSafeInteger(quantity) || quantity < 1) continue;
    const key = line.produitId || `missing-${index}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.requested += quantity;
      existing.oldPrices.push(Number(line.prixUnitaire));
    } else {
      grouped.set(key, {
        key,
        id: line.produitId || null,
        name: line.nomProduit,
        requested: quantity,
        oldPrices: [Number(line.prixUnitaire)],
      });
    }
  }
  return [...grouped.values()];
}

export async function readReorderProducts(lines, fetchProduct) {
  const results = new Map();
  const ids = [...new Set(lines.map((line) => line.id).filter(Boolean))];
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (index < ids.length) {
        const id = ids[index++];
        try {
          const raw = await fetchProduct(id);
          results.set(id, raw?.id === id ? { raw } : { error: "unverified" });
        } catch (error) {
          results.set(id, {
            error: error.response?.status === 404 ? "missing" : "unverified",
          });
        }
      }
    }),
  );
  return results;
}

export function prepareReorder(lines, results, cartItems, resolveImage) {
  return lines.map((line) => {
    const result = results.get(line.id);
    const product = result?.raw ? adaptProduct(result.raw, resolveImage) : null;
    let reason = !line.id || result?.error === "missing" ? "missing" : null;
    if (!reason && (!product || result?.error)) reason = "unverified";
    if (!reason && result.raw.estActif !== true) reason = "missing";
    if (!reason && stockState(product) === "out") reason = "out";
    if (!reason && stockState(product) === "unknown") reason = "availability";
    if (!reason && !canBuy(product)) reason = "price";
    const alreadyInCart =
      cartItems.find((item) => item.id === line.id)?.quantity || 0;
    const max = reason
      ? 0
      : Math.max(0, Math.floor(product.stock) - alreadyInCart);
    if (!reason && !max) reason = "cart-full";
    return {
      ...line,
      product,
      reason,
      alreadyInCart,
      max,
      quantity: Math.min(line.requested, max),
      priceChanged: Boolean(
        product &&
        line.oldPrices.some((price) => price !== product.retailPrice),
      ),
    };
  });
}

// Only material changes to the chosen lines require a fresh acceptance.
export function reorderChanged(previous, current, selection) {
  return previous.some((row) => {
    const quantity = Number(selection[row.key] || 0);
    if (!quantity) return false;
    const next = current.find((item) => item.key === row.key);
    return (
      !next ||
      next.reason ||
      quantity > next.max ||
      row.product?.retailPrice !== next.product?.retailPrice
    );
  });
}
