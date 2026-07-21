import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CashierPOSPage } from './CashierPOSPage';

const selectTicket = vi.fn();
vi.mock('./useCashierCheckoutFlow', () => ({
  useCashierCheckoutFlow: () => ({
    tickets: [{ id: 't1', numeroTicket: 'TIC-001', vendeurId: 'v1', montantTotal: 15000, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 600000).toISOString(), lignes: [{ id: 'l1', nomProduit: 'Relais 12V', quantite: 2, prixUnitaire: 7500, sousTotal: 15000 }] }],
    selected: null, step: 'QUEUE', loading: false, submitting: false, error: null, caisse: { statut: 'OUVERTE', solde: 42000 },
    method: 'ESPECES', documentType: 'TICKET_CAISSE', customerQuery: '', customerResults: [], customer: null,
    cashReceived: '', reference: '', deposit: '', dueDate: '', result: null, creditPreview: null,
    total: 0, change: 0, canPay: false, queueTotal: 15000, selectTicket,
    closeTicket: vi.fn(), checkout: vi.fn(), setStep: vi.fn(), setMethod: vi.fn(), setDocumentType: vi.fn(), setCustomerQuery: vi.fn(), setCustomer: vi.fn(), setCashReceived: vi.fn(), setReference: vi.fn(), setDeposit: vi.fn(), setDueDate: vi.fn(),
  }),
}));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ success: vi.fn() }) }));

describe('CashierPOSPage', () => {
  beforeEach(() => selectTicket.mockClear());
  it('présente la file, le solde et le montant du bon', () => {
    render(<CashierPOSPage />);
    expect(screen.getAllByText('Tickets à encaisser').length).toBeGreaterThan(0);
    expect(screen.getByText('TIC-001')).toBeTruthy();
    expect(screen.getByText('Caisse ouverte')).toBeTruthy();
    expect(screen.getAllByText(/15.*000 FCFA/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('TIC-001').closest('button')!);
    expect(selectTicket).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });
});
