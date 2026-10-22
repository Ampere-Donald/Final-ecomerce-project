import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
  role: 'CAISSIER',
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: {
      id: 'cashier-test',
      nom: 'Caissier Test',
      username: 'caissier_test',
      role: authMocks.role,
    },
    logout: authMocks.logout,
  }),
}));

describe('Sidebar for a cashier', () => {
  beforeEach(() => {
    authMocks.logout.mockClear();
    authMocks.role = 'CAISSIER';
  });

  it('makes checkout primary and clearly separates cash opening and closing', () => {
    render(
      <MemoryRouter initialEntries={['/file-caissier']}>
        <Sidebar open onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const checkoutLink = screen.getByRole('link', { name: 'Encaissement' });
    const cashSessionLink = screen.getByRole('link', { name: 'Session de caisse' });

    expect(checkoutLink.getAttribute('href')).toBe('/file-caissier');
    expect(cashSessionLink.getAttribute('href')).toBe('/caisse-jour');
    expect(screen.queryByRole('link', { name: 'Caisse du jour' })).toBeNull();
    expect(checkoutLink.compareDocumentPosition(cashSessionLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('garde la déconnexion disponible dans la barre compacte tablette et desktop', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/file-caissier']}>
        <Sidebar open onClose={vi.fn()} compact />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(authMocks.logout).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });
});

describe('Sidebar for an administrator', () => {
  it.each(['SUPER_ADMIN', 'ADMIN', 'VENDEUR', 'CAISSIER', 'MANAGER'])('rend les prix manquants accessibles à %s', role => {
    authMocks.role = role;
    render(<MemoryRouter><Sidebar open onClose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Prix à renseigner' }).getAttribute('href')).toBe('/prix-a-renseigner');
  });

  it('retrouve une rubrique par son nom', () => {
    authMocks.role = 'ADMIN';
    render(<MemoryRouter><Sidebar open onClose={vi.fn()} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Trouver une rubrique' }), { target: { value: 'Factures' } });
    expect(screen.getByRole('link', { name: 'Factures' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Analyses' })).toBeNull();
  });

  it('restores the full operational menu while keeping superadmin-only access hidden', () => {
    authMocks.role = 'ADMIN';
    render(<MemoryRouter><Sidebar open onClose={vi.fn()} /></MemoryRouter>);

    for (const [label, path] of [
      ['Tableau de bord', '/'], ['Analyses', '/analyses'], ['Caisse globale', '/caisse'],
      ['Ventes', '/ventes'], ['Devis et proformas', '/proformas'], ['Factures', '/invoices'],
      ['Devis en ligne', '/demandes-devis'], ['Avis clients', '/avis'],
      ['Mouvements stock', '/stock'], ['Inventaire', '/inventaire'], ['Fournisseurs', '/fournisseurs'],
      ['Paie', '/paie'], ['Journal impressions', '/print-audit'],
    ]) {
      expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(path);
    }
    expect(screen.queryByRole('link', { name: 'Rôles' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Employés' })).toBeNull();
  });
});
