import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminMobileNav } from './AdminMobileNav';

const authState = vi.hoisted(() => ({ role: 'SUPER_ADMIN' }));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({ admin: { role: authState.role } }),
}));

describe('AdminMobileNav', () => {
  it('expose exactement les cinq destinations du superadministrateur', () => {
    authState.role = 'SUPER_ADMIN';
    render(<MemoryRouter><AdminMobileNav onMenuClick={vi.fn()} /></MemoryRouter>);
    const navigation = screen.getByRole('navigation', { name: 'Navigation Superadministrateur mobile' });
    expect(navigation.querySelectorAll('a')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Vue globale' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'À valider' }).getAttribute('href')).toBe('/a-valider');
    expect(screen.getByRole('link', { name: 'Finance' }).getAttribute('href')).toBe('/finance');
    expect(screen.getByRole('link', { name: 'Stock' }).getAttribute('href')).toBe('/stock-achats');
    expect(screen.getByRole('link', { name: 'Équipe' }).getAttribute('href')).toBe('/equipe-acces');
    expect(screen.queryByText('Plus')).toBeNull();
  });

  it('expose exactement les cinq destinations opérationnelles de l’administrateur', () => {
    authState.role = 'ADMIN';
    render(<MemoryRouter><AdminMobileNav onMenuClick={vi.fn()} /></MemoryRouter>);
    const navigation = screen.getByRole('navigation', { name: 'Navigation Administrateur mobile' });
    expect(navigation.querySelectorAll('a')).toHaveLength(5);
    expect(screen.getByRole('link', { name: "Aujourd'hui" }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Ventes' }).getAttribute('href')).toBe('/ventes-commandes');
    expect(screen.getByRole('link', { name: 'Stock' }).getAttribute('href')).toBe('/stock-achats');
    expect(screen.getByRole('link', { name: 'Clients' }).getAttribute('href')).toBe('/clients');
    expect(screen.getByRole('link', { name: 'Caisse' }).getAttribute('href')).toBe('/caisse-admin');
  });

  it('donne au caissier un accès direct à tout son parcours', () => {
    authState.role = 'CAISSIER';
    render(<MemoryRouter><AdminMobileNav onMenuClick={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Navigation Caissier mobile' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Encaisser' }).getAttribute('href')).toBe('/file-caissier');
    expect(screen.getByRole('link', { name: 'Caisse' }).getAttribute('href')).toBe('/caisse-jour');
    expect(screen.getByRole('link', { name: 'Factures' }).getAttribute('href')).toBe('/invoices');
  });

  it('donne au vendeur un accès direct à la vente et à ses tickets', () => {
    authState.role = 'VENDEUR';
    render(<MemoryRouter><AdminMobileNav onMenuClick={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Navigation Vendeur mobile' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Vendre' }).getAttribute('href')).toBe('/pos');
    expect(screen.getByRole('link', { name: 'Tickets' }).getAttribute('href')).toBe('/mes-tickets');
    expect(screen.getByRole('link', { name: 'Produits' }).getAttribute('href')).toBe('/produits');
  });

  it('ouvre les autres rubriques depuis Plus pour un rôle comptoir', async () => {
    const onMenuClick = vi.fn();
    authState.role = 'CAISSIER';
    render(<MemoryRouter><AdminMobileNav onMenuClick={onMenuClick} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir toutes les rubriques' }));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });
});
