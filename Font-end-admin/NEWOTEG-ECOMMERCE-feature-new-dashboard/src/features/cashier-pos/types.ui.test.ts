import { describe, expect, it } from 'vitest';
import { money } from './types';

describe('cashier formatters', () => {
  it('affiche les montants en FCFA sans décimales', () => {
    expect(money(12500)).toContain('12');
    expect(money(12500)).toContain('500 FCFA');
  });

  it('neutralise une valeur non numérique', () => {
    expect(money('invalide')).toBe('0 FCFA');
  });
});
