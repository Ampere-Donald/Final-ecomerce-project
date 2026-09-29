import { canBuy } from "./productData.js";

// Stored stock is a last-known bound; the server must revalidate at checkout.
export function quantityLimit(product) {
  return product.stock != null && Number.isFinite(Number(product.stock))
    ? Math.max(0, Math.floor(Number(product.stock)))
    : Number.MAX_SAFE_INTEGER;
}

export function hydrateCart(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        item &&
        item.id &&
        item.code &&
        Number.isFinite(Number(item.retailPrice)) &&
        Number(item.retailPrice) > 0 &&
        Number.isFinite(Number(item.quantity)) &&
        Number(item.quantity) >= 1,
    )
    .map((item) => ({
      ...item,
      retailPrice: Number(item.retailPrice),
      quantity: Math.floor(Number(item.quantity)),
    }));
}

export function canAddSelection(state, selection) {
  const ids = new Set();
  return (
    Array.isArray(selection) &&
    selection.length > 0 &&
    selection.every(({ product, quantity }) => {
      if (
        !product?.id ||
        ids.has(product.id) ||
        !canBuy(product) ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
      )
        return false;
      ids.add(product.id);
      const existing =
        state.find((item) => item.id === product.id)?.quantity || 0;
      return existing + quantity <= quantityLimit(product);
    })
  );
}

export function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_SELECTION": {
      if (!canAddSelection(state, action.payload)) return state;
      return action.payload.reduce(
        (items, payload) => cartReducer(items, { type: "ADD_ITEM", payload }),
        state,
      );
    }
    case "HYDRATE":
      return hydrateCart(action.payload);
    case "ADD_ITEM": {
      const { product, quantity } = action.payload;
      if (
        !product.id ||
        !Number.isFinite(quantity) ||
        quantity < 1 ||
        !(product.retailPrice > 0)
      )
        return state;
      const limit = quantityLimit(product);
      if (!limit) return state;
      const existing = state.find((item) => item.id === product.id);
      const next = {
        ...product,
        code: existing?.code || product.code,
        quantity: Math.min(
          limit,
          (existing?.quantity || 0) + Math.floor(quantity),
        ),
      };
      return existing
        ? state.map((item) => (item.id === product.id ? next : item))
        : [...state, next];
    }
    case "REMOVE_ITEM":
      return state.filter((item) => item.code !== action.payload);
    case "UPDATE_QUANTITY": {
      const { code, quantity } = action.payload;
      if (!Number.isFinite(quantity)) return state;
      if (quantity <= 0) return state.filter((item) => item.code !== code);
      return state.map((item) =>
        item.code === code
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(quantityLimit(item), Math.floor(quantity)),
              ),
            }
          : item,
      );
    }
    case "CLEAR_CART":
      return [];
    default:
      return state;
  }
}
