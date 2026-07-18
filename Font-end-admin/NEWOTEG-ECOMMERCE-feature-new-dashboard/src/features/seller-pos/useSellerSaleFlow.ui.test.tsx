import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSellerSaleFlow } from './useSellerSaleFlow';

describe('useSellerSaleFlow', () => {
  it('centralise les totaux et les transitions du panier', () => {
    const { result } = renderHook(() => useSellerSaleFlow([{ prix: 2500, quantite: 2 }]));
    expect(result.current.total).toBe(5000);
    expect(result.current.totalUnits).toBe(2);
    expect(result.current.phase).toBe('SELLING');

    act(() => result.current.setPhase('REVIEWING'));
    expect(result.current.phase).toBe('REVIEWING');

    act(() => result.current.setItems([]));
    expect(result.current.total).toBe(0);
    expect(result.current.phase).toBe('IDLE');
  });
});
