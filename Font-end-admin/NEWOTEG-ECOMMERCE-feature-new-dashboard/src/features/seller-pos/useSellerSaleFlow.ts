import { useCallback, useMemo, useRef, useState } from 'react';

export type SellerSalePhase = 'IDLE' | 'SELLING' | 'REVIEWING' | 'SENDING' | 'SENT' | 'SUSPENDED' | 'ERROR';

export function useSellerSaleFlow<T extends { prix: number; quantite: number }>(initialItems: T[]) {
  const [items, setItemsState] = useState<T[]>(initialItems);
  const itemsRef = useRef(items);
  const [phase, setPhase] = useState<SellerSalePhase>(initialItems.length ? 'SELLING' : 'IDLE');

  const setItems = useCallback((nextValue: React.SetStateAction<T[]>) => {
    const next = typeof nextValue === 'function'
      ? (nextValue as (previous: T[]) => T[])(itemsRef.current)
      : nextValue;
    itemsRef.current = next;
    setItemsState(next);
    setPhase(next.length ? 'SELLING' : 'IDLE');
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.prix * item.quantite, 0), [items]);
  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantite, 0), [items]);

  return { items, itemsRef, setItems, total, totalUnits, phase, setPhase };
}
