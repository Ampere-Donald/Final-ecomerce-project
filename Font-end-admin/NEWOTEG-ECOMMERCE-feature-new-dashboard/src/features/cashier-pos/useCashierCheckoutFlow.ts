import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bonVenteApi, caisseJourApi, clientApi, getApiErrorMessage } from '../../services/api';
import { subscribeAuthenticatedSse } from '../../services/authenticatedSse';
import type { CashierClient, CashierTicket, CheckoutStatus, CheckoutStep, DocumentType, PaymentMethod } from './types';
import { paymentMethodNeedsReference } from '../pos-shared/paymentMethods';

export function useCashierCheckoutFlow() {
  const [tickets, setTickets] = useState<CashierTicket[]>([]);
  const [selected, setSelected] = useState<CashierTicket | null>(null);
  const [step, setStep] = useState<CheckoutStep>('QUEUE');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [caisse, setCaisse] = useState<any>(null);
  const [method, setMethod] = useState<PaymentMethod>('ESPECES');
  const [documentType, setDocumentType] = useState<DocumentType>('TICKET_CAISSE');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CashierClient[]>([]);
  const [customer, setCustomer] = useState<CashierClient | null>(null);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerSearchAttempted, setCustomerSearchAttempted] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [deposit, setDeposit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [result, setResult] = useState<any>(null);
  const [creditPreview, setCreditPreview] = useState<any>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [requestAcknowledged, setRequestAcknowledged] = useState(true);
  const checkoutInFlight = useRef(false);

  const applyPendingTickets = useCallback((pending: CashierTicket[]) => {
    setTickets(pending || []);
    setSelected((current) => current ? (pending || []).find((item) => item.id === current.id) || current : null);
  }, []);

  const refreshPendingTickets = useCallback(async () => {
    try {
      applyPendingTickets(await bonVenteApi.pending());
    } catch {
      // La connexion SSE retentera automatiquement. Ne pas masquer l'écran
      // courant pour un rafraîchissement silencieux de la file.
    }
  }, [applyPendingTickets]);

  const load = useCallback(async (preserveCurrentError = false) => {
    if (!preserveCurrentError) setError(null);
    try {
      const [pending, day] = await Promise.all([
        bonVenteApi.pending(),
        caisseJourApi.aujourdhui().catch(() => null),
      ]);
      applyPendingTickets(pending || []);
      setCaisse(day);
    } catch (cause: any) {
      if (!preserveCurrentError) setError(cause?.response?.data?.message || 'La file ne peut pas être chargée. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [applyPendingTickets]);

  useEffect(() => {
    void load();
    let refreshTimer: number | undefined;
    const unsubscribe = subscribeAuthenticatedSse('/bons/stream', () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshPendingTickets(), 180);
    });
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [load, refreshPendingTickets]);

  const searchCustomers = useCallback(async (value = customerQuery) => {
    const query = value.trim();
    setCustomerSearchAttempted(true);
    setCustomerSearchError(null);
    if (query.length < 2) {
      setCustomerResults([]);
      setCustomerSearchError('Saisissez au moins 2 caractères ou chiffres.');
      return [];
    }
    setCustomerSearching(true);
    try {
      const results = await clientApi.search(query, 8);
      setCustomerResults(results);
      return results;
    } catch (cause) {
      setCustomerResults([]);
      setCustomerSearchError(getApiErrorMessage(cause, 'La recherche client a échoué. Réessayez.'));
      return [];
    } finally {
      setCustomerSearching(false);
    }
  }, [customerQuery]);

  useEffect(() => {
    if (customer || customerQuery.trim().length < 2) {
      if (customerQuery.trim().length < 2) setCustomerResults([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      void searchCustomers();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [customerQuery, customer, searchCustomers]);

  useEffect(() => {
    if (method !== 'CREDIT' || !customer || !selected) {
      setCreditPreview(null);
      return;
    }
    const timeout = window.setTimeout(() => {
      clientApi.previewCredit(customer.id, Number(selected.montantTotal), Number(deposit || 0))
        .then(setCreditPreview)
        .catch(() => setCreditPreview(null));
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [customer, deposit, method, selected]);

  const resetPayment = useCallback(() => {
    setMethod('ESPECES');
    setDocumentType('TICKET_CAISSE');
    setCustomerQuery('');
    setCustomerResults([]);
    setCustomer(null);
    setCustomerSearching(false);
    setCustomerSearchAttempted(false);
    setCustomerSearchError(null);
    setCashReceived('');
    setReference('');
    setDeposit('');
    setDueDate('');
    setResult(null);
    setError(null);
    setCheckoutStatus('IDLE');
    setRequestAcknowledged(true);
  }, []);

  const selectTicket = useCallback((ticket: CashierTicket) => {
    if (checkoutInFlight.current) return;
    resetPayment();
    setSelected(ticket);
    setCustomer(ticket.client || null);
    setCustomerQuery(ticket.client ? '' : ticket.telephoneClient || '');
    setRequestAcknowledged(!ticket.noteCaissier?.trim());
    setStep('TICKET');
  }, [resetPayment]);

  const closeTicket = useCallback(() => {
    if (checkoutInFlight.current) return;
    setSelected(null);
    setStep('QUEUE');
    resetPayment();
  }, [resetPayment]);

  const total = Number(selected?.montantTotal || 0);
  const change = method === 'ESPECES' ? Math.max(0, Number(cashReceived || 0) - total) : 0;
  const canContinueTicket = !selected?.noteCaissier?.trim() || requestAcknowledged;
  const canPay = Boolean(selected) && !submitting && caisse?.statut !== 'FERMEE'
    && canContinueTicket
    && (method !== 'ESPECES' || Number(cashReceived) >= total)
    && (method !== 'CREDIT' || Boolean(customer && dueDate && creditPreview?.autorise));

  const paymentBlockReason = useMemo(() => {
    if (!selected) return 'Sélectionnez un ticket à encaisser.';
    if (submitting) return 'Le paiement est en cours de validation.';
    if (caisse?.statut === 'FERMEE') return 'La caisse est fermée. Ouvrez une session avant d’encaisser.';
    if (!canContinueTicket) return 'Confirmez que la demande du client a été prise en compte.';
    if (method === 'ESPECES' && Number(cashReceived) < total) return 'Le montant reçu est inférieur au total à payer.';
    if (method === 'CREDIT' && !customer) return 'Sélectionnez un client pour accorder un crédit.';
    if (method === 'CREDIT' && !dueDate) return 'Choisissez une date d’échéance.';
    if (method === 'CREDIT' && !creditPreview?.autorise) return 'Ce crédit ne peut pas être validé avec les conditions actuelles.';
    return null;
  }, [caisse?.statut, canContinueTicket, cashReceived, creditPreview?.autorise, customer, dueDate, method, selected, submitting, total]);

  const checkout = useCallback(async () => {
    if (!selected || !canPay || checkoutInFlight.current) return null;
    checkoutInFlight.current = true;
    setSubmitting(true);
    setCheckoutStatus('VALIDATING');
    setError(null);
    try {
      const response = await bonVenteApi.valider(selected.id, {
        methodePaiement: method,
        documentType,
        clientId: customer?.id ?? null,
        montantRecu: method === 'ESPECES' ? Number(cashReceived) : undefined,
        montantPaye: method === 'CREDIT' ? Number(deposit || 0) : undefined,
        referencePaiement: paymentMethodNeedsReference(method) ? reference.trim() || undefined : undefined,
        dateEcheance: method === 'CREDIT' ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
        idempotencyKey: `checkout-${selected.id}`,
      });
      setResult(response);
      setCheckoutStatus('PAID');
      setStep('SUCCESS');
      // La vente est déjà enregistrée. La confirmation et l'impression ne doivent
      // pas attendre le prochain rafraîchissement de la file de tickets.
      void load();
      return response;
    } catch (cause: any) {
      setCheckoutStatus('FAILED');
      setError(getApiErrorMessage(cause, 'Le paiement n’a pas été enregistré. Vérifiez les informations puis réessayez.'));
      if (cause?.response?.status === 409) {
        setSelected(null);
        setStep('QUEUE');
      }
      void load(true);
      return null;
    } finally {
      checkoutInFlight.current = false;
      setSubmitting(false);
    }
  }, [canPay, cashReceived, customer, deposit, documentType, dueDate, load, method, reference, selected]);

  const createCustomer = useCallback(async (nom: string, telephone: string) => {
    if (!nom.trim() || !telephone.trim()) return null;
    setCreatingCustomer(true);
    try {
      const created = await clientApi.create({ nom: nom.trim(), telephone: telephone.trim() });
      setCustomer(created);
      setCustomerQuery('');
      setCustomerResults([]);
      return created;
    } finally {
      setCreatingCustomer(false);
    }
  }, []);

  const queueTotal = useMemo(() => tickets.reduce((sum, ticket) => sum + Number(ticket.montantTotal), 0), [tickets]);

  return {
    tickets, selected, step, loading, submitting, checkoutStatus, error, caisse, method, documentType,
    customerQuery, customerResults, customer, cashReceived, reference, deposit, dueDate,
    result, creditPreview, creatingCustomer, customerSearching, customerSearchAttempted, customerSearchError,
    total, change, canPay, canContinueTicket, requestAcknowledged, paymentBlockReason, queueTotal, load, selectTicket, closeTicket, checkout, createCustomer, searchCustomers,
    setStep, setMethod, setDocumentType, setCustomerQuery, setCustomer, setCashReceived,
    setReference, setDeposit, setDueDate, setRequestAcknowledged,
  };
}

export type CashierCheckoutFlow = ReturnType<typeof useCashierCheckoutFlow>;
