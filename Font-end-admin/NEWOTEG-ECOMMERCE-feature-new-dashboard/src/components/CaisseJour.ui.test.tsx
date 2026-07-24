import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaisseJour } from './CaisseJour';

const apiMocks = vi.hoisted(() => ({
  aujourdhui: vi.fn(),
  getOne: vi.fn(),
  fermer: vi.fn(),
  getFactures: vi.fn(),
  getCoffres: vi.fn(),
}));

vi.mock('../services/api', () => ({
  caisseJourApi: {
    aujourdHui: apiMocks.aujourdhui,
    aujourdhui: apiMocks.aujourdhui,
    getOne: apiMocks.getOne,
    fermer: apiMocks.fermer,
  },
  factureApi: { getAll: apiMocks.getFactures },
  coffreApi: { getAll: apiMocks.getCoffres },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: { id: 'cashier-1', nom: 'Caissier Test', username: 'caissier_test', role: 'CAISSIER' },
  }),
}));

vi.mock('./ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('./FileCaissier', () => ({ FileCaissier: () => null }));
vi.mock('./ReceiptGenerator', () => ({ ReceiptGenerator: () => null }));
vi.mock('./FactureVirtuelleModal', () => ({ FactureVirtuelleModal: () => null }));
vi.mock('./Proformas', () => ({ Proformas: () => null }));
vi.mock('./Invoices', () => ({ Invoices: () => null }));
vi.mock('../features/cashier-pos/CashierDesktopShell', () => ({
  CashierDesktopTopBar: () => <div>Barre caisse</div>,
}));

describe('CaisseJour — transfert de clôture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.aujourdhui.mockResolvedValue({
      id: 'day-1',
      date: '2026-07-24T00:00:00.000Z',
      ouvertureAt: '2026-07-24T08:00:00.000Z',
      statut: 'OUVERTE',
      solde: 75_000,
    });
    apiMocks.getOne.mockResolvedValue({ operations: [] });
    apiMocks.getFactures.mockResolvedValue([]);
    apiMocks.getCoffres.mockResolvedValue([
      { id: 'vault-1', nom: 'Coffre urgence', statut: 'ACTIF', soldeActuel: 25_000 },
      { id: 'vault-closed', nom: 'Coffre clôturé', statut: 'CLOTURE', soldeActuel: 40_000 },
    ]);
    apiMocks.fermer.mockResolvedValue({ id: 'day-1', statut: 'FERMEE' });
  });

  it('permet au caissier de choisir un coffre actif avant la fermeture', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CaisseJour />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Fermer la caisse' }));

    expect((screen.getByRole('radio', { name: /Caisse globale/i }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole('radio', { name: /Coffre clôturé/i })).toBeNull();

    await user.click(screen.getByRole('radio', { name: /Coffre urgence/i }));
    expect(screen.getByText(/Après transfert : 100 000 FCFA/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Fermer et transférer' }));

    await waitFor(() => {
      expect(apiMocks.fermer).toHaveBeenCalledWith('day-1', {
        note: undefined,
        coffreId: 'vault-1',
      });
    });
  });
});
