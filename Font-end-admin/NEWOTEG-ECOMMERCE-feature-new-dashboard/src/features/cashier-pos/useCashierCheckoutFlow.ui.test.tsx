import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCashierCheckoutFlow } from './useCashierCheckoutFlow';

const mocks = vi.hoisted(() => ({
  pending: vi.fn(),
  valider: vi.fn(),
  caisse: vi.fn(),
  clientSearch: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  bonVenteApi: { pending: mocks.pending, valider: mocks.valider },
  caisseJourApi: { aujourdhui: mocks.caisse },
  clientApi: {
    search: mocks.clientSearch,
    create: vi.fn(),
    previewCredit: vi.fn(),
  },
  getApiErrorMessage: (cause: any, fallback: string) => cause?.response?.data?.message || fallback,
}));

vi.mock('../../services/authenticatedSse', () => ({
  subscribeAuthenticatedSse: () => () => undefined,
}));

const ticket = {
  id: 'ticket-1',
  numeroTicket: 'T-0001',
  vendeurId: 'vendeur-1',
  montantTotal: 7_500,
  createdAt: '2026-07-22T08:00:00.000Z',
  expiresAt: '2026-07-22T10:00:00.000Z',
  lignes: [{ id: 'line-1', nomProduit: 'Produit test', quantite: 1, prixUnitaire: 7_500, sousTotal: 7_500 }],
};

const checkoutResponse = {
  bon: { id: ticket.id, statut: 'VALIDE' },
  facture: { id: 'facture-1', numero: 'TIC-0001', dateEmission: '2026-07-22T09:00:00.000Z', lignes: [] },
};

describe('useCashierCheckoutFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending.mockResolvedValue([ticket]);
    mocks.caisse.mockResolvedValue({ id: 'caisse-1', statut: 'OUVERTE' });
    mocks.valider.mockResolvedValue(checkoutResponse);
  });

  it('confirme le paiement sans attendre le rechargement de la file', async () => {
    const neverReloads = new Promise<never>(() => undefined);
    mocks.pending.mockResolvedValueOnce([ticket]).mockReturnValueOnce(neverReloads);
    const { result } = renderHook(() => useCashierCheckoutFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.selectTicket(ticket);
      result.current.setCashReceived('15000');
      result.current.setStep('PAYMENT');
    });
    await waitFor(() => expect(result.current.canPay).toBe(true));

    await act(async () => {
      const response = await result.current.checkout();
      expect(response).toEqual(checkoutResponse);
    });

    expect(result.current.step).toBe('SUCCESS');
    expect(result.current.checkoutStatus).toBe('PAID');
    expect(result.current.result).toEqual(checkoutResponse);
  });

  it('bloque le double encaissement pendant une requête active', async () => {
    let resolveCheckout!: (value: typeof checkoutResponse) => void;
    mocks.valider.mockReturnValue(new Promise(resolve => { resolveCheckout = resolve; }));
    const { result } = renderHook(() => useCashierCheckoutFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.selectTicket(ticket);
      result.current.setCashReceived('15000');
    });
    await waitFor(() => expect(result.current.canPay).toBe(true));

    let first!: Promise<any>;
    let second!: Promise<any>;
    act(() => {
      first = result.current.checkout();
      second = result.current.checkout();
    });
    await expect(second).resolves.toBeNull();
    expect(mocks.valider).toHaveBeenCalledOnce();

    resolveCheckout(checkoutResponse);
    await act(async () => { await first; });
    expect(result.current.checkoutStatus).toBe('PAID');
  });

  it('rend une erreur API lisible et autorise une nouvelle tentative', async () => {
    mocks.valider.mockRejectedValueOnce({ response: { data: { message: 'La caisse est fermée.' } } });
    const { result } = renderHook(() => useCashierCheckoutFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.selectTicket(ticket);
      result.current.setCashReceived('15000');
      result.current.setStep('PAYMENT');
    });
    await waitFor(() => expect(result.current.canPay).toBe(true));

    await act(async () => { await result.current.checkout(); });

    expect(result.current.checkoutStatus).toBe('FAILED');
    expect(result.current.error).toBe('La caisse est fermée.');
    expect(result.current.submitting).toBe(false);
  });
});
