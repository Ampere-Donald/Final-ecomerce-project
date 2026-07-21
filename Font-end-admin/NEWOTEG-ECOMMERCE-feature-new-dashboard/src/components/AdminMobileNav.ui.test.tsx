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
  it('expose les tâches principales à un administrateur', () => {
    authState.role = 'SUPER_ADMIN';
    render(<MemoryRouter><AdminMobileNav onMenuClick={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Navigation Admin mobile' })).toBeTruthy();
    expect(screen.getByText('Accueil')).toBeTruthy();
    expect(screen.getByText('Ventes')).toBeTruthy();
    expect(screen.getByText('Produits')).toBeTruthy();
    expect(screen.getByText('Clients')).toBeTruthy();
    expect(screen.getByText('Plus')).toBeTruthy();
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

  it('ouvre les autres rubriques depuis Plus', async () => {
    const onMenuClick = vi.fn();
    authState.role = 'CAISSIER';
    render(<MemoryRouter><AdminMobileNav onMenuClick={onMenuClick} /></MemoryRouter>);

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir toutes les rubriques' }));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });
});
