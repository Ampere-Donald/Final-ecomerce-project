import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POSVendeur } from '../../components/POSVendeur';

const success = vi.fn();

vi.mock('../../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({ admin: { id: 'seller-1', nom: 'Vendeur Test', role: 'VENDEUR' } }),
}));
vi.mock('../../context/FlowShellContext', () => ({ useFlowShellFocus: vi.fn() }));
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ success, error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

const preview = {
  sellerName: 'Vendeur Test',
  products: [
    { id: 'fer', nomProduit: 'Fer à souder 40W original', marque: 'Proskit', code: '00042', quantiteStock: 5, prixDetail: 3500 },
    { id: 'support', nomProduit: 'Support pour fer à souder', marque: 'Generic', code: '00043', quantiteStock: 8, prixDetail: 1500 },
    { id: 'condensateur', nomProduit: 'Condensateur 40V', marque: 'Rubycon', code: '00980', quantiteStock: 12, prixDetail: 250 },
  ],
};

describe('recherche rapide du parcours vendeur', () => {
  beforeEach(() => {
    success.mockClear();
    localStorage.clear();
  });

  it('filtre immédiatement plusieurs mots puis ajoute le premier résultat avec Entrée', () => {
    render(<MemoryRouter><POSVendeur preview={preview} /></MemoryRouter>);

    const search = screen.getByPlaceholderText('Nom, marque, code-barres ou référence…');
    fireEvent.change(search, { target: { value: 'fer souder 40w' } });

    expect(screen.getAllByText('Fer à souder 40W original').length).toBeGreaterThan(0);
    expect(screen.queryByText('Condensateur 40V')).toBeNull();
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(success).toHaveBeenCalledWith(
      expect.stringContaining('Fer à souder 40W original'),
      1800,
      'pos-cart-feedback',
    );
    expect((search as HTMLInputElement).value).toBe('');
  });

  it('affiche des suggestions pour un nom proche et permet de les choisir au toucher', () => {
    render(<MemoryRouter><POSVendeur preview={preview} /></MemoryRouter>);

    const search = screen.getByPlaceholderText('Nom, marque, code-barres ou référence…');
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'condansateur' } });

    const suggestions = screen.getByRole('listbox', { name: 'Suggestions de produits' });
    expect(within(suggestions).getByText('Condensateur 40V')).toBeTruthy();
    expect(within(suggestions).getByText('Nom proche')).toBeTruthy();
    fireEvent.click(within(suggestions).getByRole('option', { name: /Condensateur 40V/i }));

    expect(success).toHaveBeenCalledWith(
      expect.stringContaining('Condensateur 40V'),
      1800,
      'pos-cart-feedback',
    );
    expect((search as HTMLInputElement).value).toBe('');
  });
});
