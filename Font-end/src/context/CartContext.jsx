/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';

// ── Cart Context ─────────────────────────────────────────────────────────────
const CartContext = createContext(null);

// ── Cart Reducer ─────────────────────────────────────────────────────────────
function cartReducer(state, action) {
    switch (action.type) {
        case 'HYDRATE':
            return action.payload;

        case 'ADD_ITEM': {
            const { product, quantity } = action.payload;
            const existing = state.find(item => item.code === product.code);
            if (existing) {
                return state.map(item =>
                    item.code === product.code
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [
                ...state,
                {
                    id: product.id,
                    code: product.code,
                    model: product.model,
                    image: product.image,
                    retailPrice: product.retailPrice,
                    wholesalePrice: product.wholesalePrice,
                    categoryName: product.categoryName,
                    brand: product.brand,
                    marque: product.marque || product.brand,
                    quantity,
                },
            ];
        }

        case 'REMOVE_ITEM':
            return state.filter(item => item.code !== action.payload);

        case 'UPDATE_QUANTITY': {
            const { code, quantity } = action.payload;
            if (quantity <= 0) {
                return state.filter(item => item.code !== code);
            }
            return state.map(item =>
                item.code === code ? { ...item, quantity } : item
            );
        }

        case 'CLEAR_CART':
            return [];

        default:
            return state;
    }
}

// ── Cart Provider ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'newoteg_cart';

const initCart = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch { /* stockage local invalide : panier vide */ }
    return [];
};

export function CartProvider({ children }) {
    const [cartItems, dispatch] = useReducer(cartReducer, [], initCart);
    const [toasts, setToasts] = useState([]); // [{ id, message, type }]
    const [isCartOpen, setIsCartOpen] = useState(false);

    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);

    // Sync cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    }, [cartItems]);

    // ── Toast helper (queue, max 3 visible) ───────────────────
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-2), { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ── Cart Actions ──────────────────────────────────────────
    const addToCart = useCallback((product, quantity = 1) => {
        dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
        showToast(`"${product.model}" +${quantity}`, 'cart');
    }, [showToast]);

    const removeFromCart = useCallback((code) => {
        dispatch({ type: 'REMOVE_ITEM', payload: code });
    }, []);

    const updateQuantity = useCallback((code, quantity) => {
        dispatch({ type: 'UPDATE_QUANTITY', payload: { code, quantity } });
    }, []);

    const clearCart = useCallback(() => {
        dispatch({ type: 'CLEAR_CART' });
    }, []);

    // ── Derived Values ────────────────────────────────────────
    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cartItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);

    const value = {
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
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

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
    return ctx;
}

export default CartContext;
