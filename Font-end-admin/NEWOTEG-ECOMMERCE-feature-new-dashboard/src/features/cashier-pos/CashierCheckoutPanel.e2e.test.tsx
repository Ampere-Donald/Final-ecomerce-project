import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CashierCheckoutPanel } from './CashierCheckoutPanel';

vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ error: vi.fn() }) }));

const ticket = {
  id: 't1',
  numeroTicket: '#1048',
  vendeurId: 'v1',
  montantTotal: 12_500,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  lignes: [{ id: 'l1', nomProduit: 'Condensateur 100µF', quantite: 2, prixUnitaire: 6_250, sousTotal: 12_500 }],
};

function flowFor(step: 'TICKET' | 'CUSTOMER' | 'PAYMENT') {
  return {
    tickets: [ticket], selected: ticket, step, loading: false, submitting: false, error: null, caisse: null,
    method: 'ESPECES', documentType: 'FACTURE', customerQuery: '', customerResults: [], customer: null,
    cashReceived: '15000', reference: '', deposit: '', dueDate: '', result: null, creditPreview: null,
    creatingCustomer: false, total: 12_500, change: 2_500, canPay: true, queueTotal: 12_500,
    load: vi.fn(), selectTicket: vi.fn(), closeTicket: vi.fn(), checkout: vi.fn(), createCustomer: vi.fn(),
    setStep: vi.fn(), setMethod: vi.fn(), setDocumentType: vi.fn(), setCustomerQuery: vi.fn(), setCustomer: vi.fn(),
    setCashReceived: vi.fn(), setReference: vi.fn(), setDeposit: vi.fn(), setDueDate: vi.fn(),
  } as any;
}

describe('CashierCheckoutPanel', () => {
  it('présente le ticket avant l’identification du client', () => {
    const flow = flowFor('TICKET');
    render(<CashierCheckoutPanel flow={flow} onNextTicket={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Identifier' }));
    expect(flow.setStep).toHaveBeenCalledWith('CUSTOMER');
  });

  it('fait avancer l’étape client vers le paiement', () => {
    const flow = flowFor('CUSTOMER');
    render(<CashierCheckoutPanel flow={flow} onNextTicket={vi.fn()} />);
    expect(screen.getByText('Client du document')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(flow.setStep).toHaveBeenCalledWith('PAYMENT');
  });

  it('permet de choisir un paiement et d’encaisser', () => {
    const flow = flowFor('PAYMENT');
    render(<CashierCheckoutPanel flow={flow} onNextTicket={vi.fn()} />);
    expect(screen.getByText('Monnaie à rendre')).toBeTruthy();
    expect(screen.getAllByText(/500 FCFA/).some(element => element.textContent?.replace(/\s/g, '') === '2500FCFA')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Mobile Money' }));
    expect(flow.setMethod).toHaveBeenCalledWith('MOBILE_MONEY');
    fireEvent.click(screen.getByRole('button', { name: 'Encaisser' }));
    expect(flow.checkout).toHaveBeenCalledOnce();
  });
});
