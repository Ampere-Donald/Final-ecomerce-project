/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { refreshSavedProducts } from "../utils/refreshSavedProducts";

// ── Favorites Context ─────────────────────────────────────────────────────────
const FavoritesContext = createContext(null);

const STORAGE_KEY = "newoteg_favorites";

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [cacheChecked, setCacheChecked] = useState(false);

  useEffect(() => {
    let active = true;
    refreshSavedProducts(STORAGE_KEY).then(({ products, complete }) => {
      if (active) {
        setFavorites(products);
        setCacheChecked(complete);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!cacheChecked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* Favourites stay available in this session. */
    }
  }, [favorites, cacheChecked]);

  const toggleFavorite = useCallback((product) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.id === product.id);
      if (exists) {
        return prev.filter((f) => f.id !== product.id);
      }
      return [
        ...prev,
        {
          id: product.id,
          code: product.code,
          model: product.model,
          image: product.image,
          retailPrice: product.retailPrice,
          wholesalePrice: product.wholesalePrice,
          categoryName: product.categoryName,
        },
      ];
    });
  }, []);

  const isFavorite = useCallback(
    (code) => {
      return favorites.some((f) => f.code === code || f.id === code);
    },
    [favorites],
  );

  const favoritesCount = favorites.length;

  return (
    <FavoritesContext.Provider
      value={{ favorites, toggleFavorite, isFavorite, favoritesCount }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx)
    throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}

export default FavoritesContext;
