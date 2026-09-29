import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StockPurchasingWorkspace } from './AdministrationWorkspaces';

const state = vi.hoisted(() => ({ role: 'SUPER_ADMIN' }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: { role: state.role } }) }));
vi.mock('./StockAlerts', () => ({ StockAlerts: () => <p>Alertes réelles de stock</p> }));
vi.mock('./Produits', () => ({ Produits: () => <p>Catalogue réel des produits</p> }));

describe('StockPurchasingWorkspace', () => {
  beforeEach(() => { state.role = 'SUPER_ADMIN'; });

  it('réunit le réapprovisionnement dans les cinq onglets validés', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StockPurchasingWorkspace /></MemoryRouter>);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: 'À traiter' })).toBeTruthy();
    expect(await screen.findByText('Alertes réelles de stock')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Bons fournisseurs' }).getAttribute('href')).toBe('/commandes-fournisseur');
    await user.click(screen.getByRole('tab', { name: 'Produits' }));
    expect(await screen.findByText('Catalogue réel des produits')).toBeTruthy();
  });

  it('ne propose pas la commande fournisseur réservée au superadministrateur', async () => {
    state.role = 'ADMIN';
    render(<MemoryRouter><StockPurchasingWorkspace /></MemoryRouter>);
    expect(await screen.findByText('Alertes réelles de stock')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Bons fournisseurs' })).toBeNull();
  });
});
