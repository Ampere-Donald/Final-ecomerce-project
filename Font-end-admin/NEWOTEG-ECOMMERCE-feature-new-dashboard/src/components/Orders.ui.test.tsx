import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Orders } from './Orders';

const api = vi.hoisted(() => ({ getAll: vi.fn(), update: vi.fn(), getGuestAccess: vi.fn() }));
const identity = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('../services/api', () => ({ commandeApi: api }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: { role: identity.role } }) }));
const order = {
  id: 'order-test', numeroSuivi: 'TEST-RETRAIT', nomClient: 'Client Test',
  dateCommande: '2026-09-28T00:00:00Z', montantTotal: 100,
  modeReception: 'RETRAIT_MAGASIN', lignes: [],
};
beforeEach(() => { vi.clearAllMocks(); identity.role = 'ADMIN'; });

it('shows delivered status in desktop and mobile selectors without allowing a reset', async () => {
  api.getAll.mockResolvedValue([{ ...order, statut: 'LIVREE' }]);
  render(<Orders />);
  const selects = await screen.findAllByRole('combobox');
  expect(selects).toHaveLength(2);
  for (const select of selects) {
    expect((select as HTMLSelectElement).value).toBe('LIVREE');
    expect((select as HTMLSelectElement).selectedOptions[0].textContent).toBe('Livrée');
    expect((select as HTMLSelectElement).disabled).toBe(true);
  }
  expect(screen.queryByRole('button', { name: /^Retrait$/i })).toBeNull();
  expect(api.update).not.toHaveBeenCalled();
});

it('keeps the dispatch action available for an awaiting delivery order', async () => {
  api.getAll.mockResolvedValue([{ ...order, modeReception: 'LIVRAISON', statut: 'EN_ATTENTE' }]);
  api.update.mockResolvedValue({ ...order, modeReception: 'LIVRAISON', statut: 'EN_LIVRAISON' });
  render(<Orders />);
  const selects = await screen.findAllByRole('combobox');
  expect((selects[0] as HTMLSelectElement).disabled).toBe(false);
  fireEvent.change(selects[0], { target: { value: 'EN_LIVRAISON' } });
  await waitFor(() => expect(api.update).toHaveBeenCalledWith('order-test', { statut: 'EN_LIVRAISON' }));
  await waitFor(() => expect((selects[1] as HTMLSelectElement).value).toBe('EN_LIVRAISON'));
});

it('does not request or display private access administration for a seller', async () => {
  identity.role = 'VENDEUR';
  api.getAll.mockResolvedValue([{ ...order, statut: 'EN_ATTENTE' }]);
  render(<Orders />);
  fireEvent.click(await screen.findByRole('button', { name: 'Détails' }));
  await screen.findByRole('dialog', { name: 'Détails de la commande' });
  expect(screen.queryByText('Suivi sans compte')).toBeNull();
  expect(api.getGuestAccess).not.toHaveBeenCalled();
});
