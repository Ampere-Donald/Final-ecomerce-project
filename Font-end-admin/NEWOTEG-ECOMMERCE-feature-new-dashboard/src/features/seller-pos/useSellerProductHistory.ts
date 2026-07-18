import { useCallback, useState } from 'react';

const readIds = (key: string): string[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};

export function useSellerProductHistory(scope: string) {
  const favoriteKey = `newoteg_pos_favorites_${scope}`;
  const recentKey = `newoteg_pos_recent_${scope}`;
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readIds(favoriteKey));
  const [recentIds, setRecentIds] = useState<string[]>(() => readIds(recentKey));

  const persist = (key: string, ids: string[]) => {
    try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* usage non bloquant */ }
  };

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds(current => {
      const next = current.includes(id) ? current.filter(item => item !== id) : [id, ...current].slice(0, 40);
      persist(favoriteKey, next);
      return next;
    });
  }, [favoriteKey]);

  const markRecent = useCallback((id: string) => {
    setRecentIds(current => {
      const next = [id, ...current.filter(item => item !== id)].slice(0, 12);
      persist(recentKey, next);
      return next;
    });
  }, [recentKey]);

  return { favoriteIds, recentIds, toggleFavorite, markRecent };
}
