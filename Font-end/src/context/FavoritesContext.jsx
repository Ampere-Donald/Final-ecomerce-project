/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ── Favorites Context ─────────────────────────────────────────────────────────
const FavoritesContext = createContext(null);

const STORAGE_KEY = 'newoteg_favorites';

const initFavorites = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch { /* stockage local invalide : favoris vides */ }
    return [];
};

export function FavoritesProvider({ children }) {
    const [favorites, setFavorites] = useState(initFavorites);

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = useCallback((product) => {
        setFavorites(prev => {
            const exists = prev.find(f => f.code === product.code);
            if (exists) {
                return prev.filter(f => f.code !== product.code);
            }
            return [...prev, {
                id: product.id,
                code: product.code,
                model: product.model,
                image: product.image,
                retailPrice: product.retailPrice,
                wholesalePrice: product.wholesalePrice,
                categoryName: product.categoryName,
            }];
        });
    }, []);

    const isFavorite = useCallback((code) => {
        return favorites.some(f => f.code === code);
    }, [favorites]);

    const favoritesCount = favorites.length;

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, favoritesCount }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const ctx = useContext(FavoritesContext);
    if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
    return ctx;
}

export default FavoritesContext;
