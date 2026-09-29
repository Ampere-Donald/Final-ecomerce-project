import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalCenter } from './ApprovalCenter';

const api = vi.hoisted(() => ({
  getInvoices: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  getInventories: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('../services/api', () => ({
  factureVirtuelleApi: {
    getAll: api.getInvoices,
    approuver: api.approve,
    refuser: api.reject,
  },
  inventaireApi: { getAll: api.getInventories },
  getApiErrorMessage: (_cause: unknown, fallback: string) => fallback,
}));
vi.mock('../context/AdminOperationsContext', () => ({
  useAdminOperations: () => ({ refresh: api.refresh }),
}));

const invoice = {
  id: 'fv-1', numero: 'FV-0001', pourcentageMajoration: 10, totalTTC: 110000,
  margeDemarcheur: 10000, dateCreation: new Date().toISOString(),
  vendeur: { nom: 'Vendeur Test' }, client: { nom: 'Client Test' },
};

describe('ApprovalCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getInvoices.mockResolvedValue({ data: [invoice] });
    api.getInventories.mockResolvedValue([{ id: 'inv-1', reference: 'INV-001', perimetre: 'Téléphones', statut: 'EN_COURS', createdAt: new Date().toISOString(), _count: { lignes: 12 } }]);
    api.approve.mockResolvedValue({});
    api.reject.mockResolvedValue({});
    api.refresh.mockResolvedValue(undefined);
  });

  it('affiche uniquement les demandes réelles et approuve depuis le centre', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ApprovalCenter /></MemoryRouter>);
    expect(await screen.findByText('FV-0001')).toBeTruthy();
    expect(screen.getByText('INV-001')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Approuver' }));
    expect(api.approve).toHaveBeenCalledWith('fv-1');
    expect(api.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByText('FV-0001')).toBeNull();
  });

  it('exige un motif avant de confirmer un refus', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ApprovalCenter /></MemoryRouter>);
    await screen.findByText('FV-0001');
    await user.click(screen.getByRole('button', { name: 'Refuser' }));
    const confirm = screen.getByRole('button', { name: 'Confirmer le refus' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText('Motif du refus'), 'Marge à corriger');
    await user.click(confirm);
    expect(api.reject).toHaveBeenCalledWith('fv-1', 'Marge à corriger');
  });

  it('présente un état de chargement puis une erreur récupérable', async () => {
    api.getInvoices.mockRejectedValue(new Error('indisponible'));
    api.getInventories.mockRejectedValue(new Error('indisponible'));
    render(<MemoryRouter><ApprovalCenter /></MemoryRouter>);
    expect(screen.getByLabelText('Chargement des demandes')).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });
});
