import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CashierDesktopWorkArea } from './CashierDesktopWorkArea';

vi.mock('../../components/ReceiptGenerator', () => ({
  ReceiptGenerator: (props: { autoPrint?: boolean; vendeur?: string }) => <div data-testid="receipt-generator" data-auto-print={String(Boolean(props.autoPrint))} data-seller={props.vendeur}>Document prêt à imprimer</div>,
}));

const ticket = {
  id: 'ticket-1',
  numeroTicket: 'T-0001',
  vendeurId: 'vendeur-1',
  vendeur: { nom: 'Donald Test', username: 'donald_test' },
  montantTotal: 7_500,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  lignes: [{ id: 'line-1', nomProduit: 'Produit test', quantite: 1, prixUnitaire: 7_500, sousTotal: 7_500 }],
};

function makeFlow(step: 'TICKET' | 'CUSTOMER' | 'PAYMENT') {
  return {
    tickets: [ticket], selected: ticket, step, loading: false, submitting: false, error: null,
    caisse: { statut: 'OUVERTE' }, method: 'ESPECES', documentType: 'TICKET_CAISSE',
    customerQuery: 'Martine', customerResults: [], customer: null, customerSearching: false,
    customerSearchAttempted: false, customerSearchError: null, cashReceived: '15000', reference: '',
    deposit: '', dueDate: '', creditPreview: null, creatingCustomer: false, total: 7_500,
    change: 7_500, canPay: true, canContinueTicket: true, requestAcknowledged: true, queueTotal: 7_500,
    result: step === 'PAYMENT' ? { facture: { id: 'facture-1', numero: 'T-0001', dateEmission: new Date().toISOString(), lignes: [] } } : null,
    load: vi.fn(), selectTicket: vi.fn(), closeTicket: vi.fn(), createCustomer: vi.fn(),
    searchCustomers: vi.fn().mockResolvedValue([]), checkout: vi.fn().mockResolvedValue(step === 'PAYMENT' ? { facture: { id: 'facture-1' } } : null),
    setStep: vi.fn(), setMethod: vi.fn(), setDocumentType: vi.fn(), setCustomerQuery: vi.fn(),
    setCustomer: vi.fn(), setCashReceived: vi.fn(), setReference: vi.fn(), setDeposit: vi.fn(), setDueDate: vi.fn(),
    setRequestAcknowledged: vi.fn(),
  } as any;
}

describe('CashierDesktopWorkArea', () => {
  it('affiche le nom du vendeur dans le détail du ticket', () => {
    const flow = makeFlow('TICKET');
    render(<CashierDesktopWorkArea flow={flow} onNextTicket={vi.fn()} />);

    expect(screen.getAllByText(/Donald Test/).length).toBeGreaterThan(0);
  });

  it('déclenche réellement la recherche client avec le bouton Rechercher', () => {
    const flow = makeFlow('CUSTOMER');
    render(<CashierDesktopWorkArea flow={flow} onNextTicket={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(flow.searchCustomers).toHaveBeenCalledOnce();
  });

  it('valide puis demande automatiquement l’impression du document', async () => {
    const flow = makeFlow('PAYMENT');
    render(<CashierDesktopWorkArea flow={flow} onNextTicket={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Valider et imprimer' }));

    await waitFor(() => expect(flow.checkout).toHaveBeenCalledOnce());
    const receipt = await screen.findByTestId('receipt-generator');
    expect(receipt.getAttribute('data-auto-print')).toBe('true');
    expect(receipt.getAttribute('data-seller')).toBe('Donald Test');
  });
});
