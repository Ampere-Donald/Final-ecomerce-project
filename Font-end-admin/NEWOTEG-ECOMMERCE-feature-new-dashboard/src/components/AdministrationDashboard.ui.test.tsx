import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdministrationDashboard } from './AdministrationDashboard';

const state = vi.hoisted(() => ({ role: 'SUPER_ADMIN', operations: {} as any }));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({ admin: { role: state.role, nom: 'Donald Test' } }),
}));
vi.mock('../context/AdminOperationsContext', () => ({ useAdminOperations: () => state.operations }));

const baseOperations = () => ({
  cashSessionStatus: 'OUVERTE', cashSessionBalance: 125000, globalCashBalance: 420000,
  pendingOrders: [], staleOrdersCount: 0, pendingTickets: [], upcomingDeadlines: [],
  urgentDeadlinesCount: 0, lowStockProducts: [], customerCredits: [], customerCreditTotal: 0,
  pendingApprovals: [], queuedOperations: 0, printerState: 'PRETE', lastUpdated: new Date(),
  loading: false, partialError: false, refresh: vi.fn().mockResolvedValue(undefined),
});

describe('AdministrationDashboard', () => {
  beforeEach(() => { state.operations = baseOperations(); });

  it('priorise les décisions sensibles pour le superadministrateur', () => {
    state.role = 'SUPER_ADMIN';
    state.operations = { ...baseOperations(), pendingApprovals: [{ id: 'fv-1' }, { id: 'fv-2' }], staleOrdersCount: 3, lowStockProducts: [{ id: 'p-1' }] };
    render(<MemoryRouter><AdministrationDashboard /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: "Vue d’ensemble" })).toBeTruthy();
    const approvals = screen.getByRole('link', { name: /Décider sur les demandes sensibles/ });
    const orders = screen.getByRole('link', { name: /Débloquer les commandes anciennes/ });
    expect(approvals.compareDocumentPosition(orders) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('place les blocages de caisse et d’encaissement en tête pour l’administrateur', () => {
    state.role = 'ADMIN';
    state.operations = { ...baseOperations(), cashSessionStatus: 'ABSENTE', pendingTickets: [{ id: 'ticket-1' }], lowStockProducts: [{ id: 'p-1' }] };
    render(<MemoryRouter><AdministrationDashboard /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeTruthy();
    const cash = screen.getByRole('link', { name: /Rendre la caisse opérationnelle/ });
    const tickets = screen.getByRole('link', { name: /Encaisser les tickets en attente/ });
    expect(cash.compareDocumentPosition(tickets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('affiche un état de chargement stable sans données fictives', () => {
    state.role = 'ADMIN';
    state.operations = { ...baseOperations(), loading: true, lastUpdated: null };
    render(<MemoryRouter><AdministrationDashboard /></MemoryRouter>);
    expect(screen.getByLabelText('Chargement du tableau de bord')).toBeTruthy();
    expect(screen.queryByText('125 000 FCFA')).toBeNull();
  });
});
