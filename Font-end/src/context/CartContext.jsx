/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
} from "react";

import { cartReducer, canAddSelection } from "../storefront/cartState";
import { canBuy } from "../storefront/productData";
import { refreshSavedProducts } from "../utils/refreshSavedProducts";
import { inquireAboutProduct } from "../utils/productAvailability";

// ── Cart Context ─────────────────────────────────────────────────────────────
const CartContext = createContext(null);

// ── Cart Provider ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "newoteg_cart";

export function CartProvider({ children }) {
  const [cartItems, dispatch] = useReducer(cartReducer, []);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [toasts, setToasts] = useState([]); // [{ id, message, type }]
  const [isCartOpen, setIsCartOpen] = useState(false);

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
      dispatch({ type: "ADD_ITEM", payload: { product, quantity } });
      showToast(product.model, "cart");
    },
    [showToast],
  );

  const removeFromCart = useCallback((code) => {
    dispatch({ type: "REMOVE_ITEM", payload: code });
  }, []);

  const addSelection = useCallback(
    (selection) => {
      if (!canAddSelection(cartItems, selection)) return false;
      dispatch({ type: "ADD_SELECTION", payload: selection });
      showToast(
        selection[0].product.model +
          (selection.length > 1 ? ` + ${selection.length - 1}` : ""),
        "cart",
      );
      return true;
    },
    [cartItems, showToast],
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
