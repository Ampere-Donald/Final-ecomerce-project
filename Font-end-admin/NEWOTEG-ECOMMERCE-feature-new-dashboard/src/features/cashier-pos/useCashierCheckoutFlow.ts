import { useCallback, useEffect, useMemo, useState } from 'react';
import { bonVenteApi, caisseJourApi, clientApi } from '../../services/api';
import { subscribeAuthenticatedSse } from '../../services/authenticatedSse';
import type { CashierClient, CashierTicket, CheckoutStep, DocumentType, PaymentMethod } from './types';

export function useCashierCheckoutFlow() {
  const [tickets, setTickets] = useState<CashierTicket[]>([]);
  const [selected, setSelected] = useState<CashierTicket | null>(null);
  const [step, setStep] = useState<CheckoutStep>('QUEUE');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caisse, setCaisse] = useState<any>(null);
  const [method, setMethod] = useState<PaymentMethod>('ESPECES');
  const [documentType, setDocumentType] = useState<DocumentType>('TICKET_CAISSE');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CashierClient[]>([]);
  const [customer, setCustomer] = useState<CashierClient | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [deposit, setDeposit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [result, setResult] = useState<any>(null);
  const [creditPreview, setCreditPreview] = useState<any>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pending, day] = await Promise.all([
        bonVenteApi.pending(),
        caisseJourApi.aujourdhui().catch(() => null),
      ]);
      setTickets(pending || []);
      setCaisse(day);
      setSelected((current) => current ? (pending || []).find((item: CashierTicket) => item.id === current.id) || current : null);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'La file ne peut pas être chargée. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return subscribeAuthenticatedSse('/bons/stream', () => void load());
  }, [load]);

  useEffect(() => {
    if (customer || customerQuery.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      clientApi.search(customerQuery.trim(), 8).then(setCustomerResults).catch(() => setCustomerResults([]));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [customerQuery, customer]);

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
    setCashReceived('');
    setReference('');
    setDeposit('');
    setDueDate('');
    setResult(null);
  }, []);

  const selectTicket = useCallback((ticket: CashierTicket) => {
    resetPayment();
    setSelected(ticket);
    setCustomer(ticket.client || null);
    setStep('CUSTOMER');
  }, [resetPayment]);

  const closeTicket = useCallback(() => {
    setSelected(null);
    setStep('QUEUE');
    resetPayment();
  }, [resetPayment]);

  const total = Number(selected?.montantTotal || 0);
  const change = method === 'ESPECES' ? Math.max(0, Number(cashReceived || 0) - total) : 0;
  const canPay = Boolean(selected) && !submitting
    && (method !== 'ESPECES' || Number(cashReceived) >= total)
    && (method !== 'CREDIT' || Boolean(customer && dueDate && creditPreview?.autorise));

  const checkout = useCallback(async () => {
    if (!selected || !canPay) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await bonVenteApi.valider(selected.id, {
        methodePaiement: method,
        documentType,
        clientId: customer?.id ?? null,
        montantRecu: method === 'ESPECES' ? Number(cashReceived) : undefined,
        montantPaye: method === 'CREDIT' ? Number(deposit || 0) : undefined,
        referencePaiement: ['MOBILE_MONEY', 'CARTE', 'VIREMENT'].includes(method) ? reference.trim() || undefined : undefined,
        dateEcheance: method === 'CREDIT' ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
        idempotencyKey: `checkout-${selected.id}`,
      });
      setResult(response);
      setStep('SUCCESS');
      await load();
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'Le paiement n’a pas été enregistré. Vérifiez les informations.');
      if (cause?.response?.status === 409) {
        setSelected(null);
        setStep('QUEUE');
      }
      await load();
    } finally {
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
    tickets, selected, step, loading, submitting, error, caisse, method, documentType,
    customerQuery, customerResults, customer, cashReceived, reference, deposit, dueDate,
    result, creditPreview, creatingCustomer, total, change, canPay, queueTotal, load, selectTicket, closeTicket, checkout, createCustomer,
    setStep, setMethod, setDocumentType, setCustomerQuery, setCustomer, setCashReceived,
    setReference, setDeposit, setDueDate,
  };
}
