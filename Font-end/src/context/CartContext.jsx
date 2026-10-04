/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
} from "react";

import { cartJourneyReducer, canAddSelection } from "../storefront/cartState";
import {
  prepareObservation,
  recordPreparedObservation,
} from "../storefront/journey.js";
import { useI18n } from "./I18nContext";
import { canBuy } from "../storefront/productData";
import { refreshSavedProducts } from "../utils/refreshSavedProducts";
import { inquireAboutProduct } from "../utils/productAvailability";

// ── Cart Context ─────────────────────────────────────────────────────────────
const CartContext = createContext(null);

// ── Cart Provider ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "newoteg_cart";

export function CartProvider({ children }) {
  const [{ items: cartItems, observations }, dispatch] = useReducer(
    cartJourneyReducer,
    { items: [], observations: [] },
  );
  const { lang } = useI18n();
  const [cacheChecked, setCacheChecked] = useState(false);
  const [toasts, setToasts] = useState([]); // [{ id, message, type }]
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (!observations.length) return;
    observations.forEach(recordPreparedObservation);
    dispatch({ type: "OBSERVATIONS_SENT", ids: observations.map((e) => e.id) });
  }, [observations]);

  useEffect(() => {
    let active = true;
    refreshSavedProducts(STORAGE_KEY, true).then(({ products, complete }) => {
      if (active) {
        dispatch({ type: "HYDRATE", payload: products });
        setCacheChecked(complete);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    if (!cacheChecked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      /* Cart remains usable if storage is unavailable. */
    }
  }, [cartItems, cacheChecked]);

  // ── Toast helper (queue, max 3 visible) ───────────────────
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000,
    );
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Cart Actions ──────────────────────────────────────────
  const addToCart = useCallback(
    (product, quantity = 1) => {
      if (!canBuy(product)) {
        inquireAboutProduct(product);
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1) return;
      dispatch({
        type: "ADD_ITEM",
        payload: { product, quantity },
        observations: [prepareObservation("AJOUT_PANIER", lang)],
      });
      showToast(product.model, "cart");
    },
    [showToast, lang],
  );

  const removeFromCart = useCallback((code) => {
    dispatch({ type: "REMOVE_ITEM", payload: code });
  }, []);

  const addSelection = useCallback(
    (selection, { reorder = false } = {}) => {
      if (!canAddSelection(cartItems, selection)) return false;
      dispatch({
        type: "ADD_SELECTION",
        payload: selection,
        observations: [
          prepareObservation("AJOUT_PANIER", lang),
          ...(reorder ? [prepareObservation("REACHAT_AJOUTE", lang)] : []),
        ],
      });
      showToast(
        selection[0].product.model +
          (selection.length > 1 ? ` + ${selection.length - 1}` : ""),
        "cart",
      );
      return true;
    },
    [cartItems, showToast, lang],
  );

  const updateQuantity = useCallback((code, quantity) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { code, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  // ── Derived Values ────────────────────────────────────────
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.retailPrice * item.quantity,
    0,
  );

  const value = {
    cartVerified: cacheChecked,
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    addSelection,
    removeFromCart,
    updateQuantity,
    clearCart,
    toasts,
    showToast,
    dismissToast,
    isCartOpen,
    openCart,
    closeCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export default CartContext;
