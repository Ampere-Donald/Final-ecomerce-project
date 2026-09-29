import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  caisseApi,
  caisseJourApi,
  clientApi,
  commandeApi,
  echeanceApi,
  factureVirtuelleApi,
  produitApi,
  ticketApi,
} from '../services/api';
import { useAdminAuth } from './AdminAuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { isAdministrationRole } from '../config/adminNavigation';
import { listQueuedSales, OFFLINE_QUEUE_EVENT } from '../services/offlineSalesQueue';

export type CashSessionStatus = 'OUVERTE' | 'FERMEE' | 'ABSENTE' | 'INCONNUE';
export type PrinterState = 'PRETE' | 'CONFIGUREE' | 'NON_CONFIGUREE';

export interface AdminOperationsSnapshot {
  cashSessionStatus: CashSessionStatus;
  cashSessionBalance: number;
  globalCashBalance: number;
  pendingOrders: any[];
  staleOrdersCount: number;
  pendingTickets: any[];
  upcomingDeadlines: any[];
  urgentDeadlinesCount: number;
  lowStockProducts: any[];
  customerCredits: any[];
  customerCreditTotal: number;
  pendingApprovals: any[];
  queuedOperations: number;
  printerState: PrinterState;
  lastUpdated: Date | null;
  loading: boolean;
  partialError: boolean;
  refresh: () => Promise<void>;
}

const initialSnapshot: Omit<AdminOperationsSnapshot, 'refresh'> = {
  cashSessionStatus: 'INCONNUE',
  cashSessionBalance: 0,
  globalCashBalance: 0,
  pendingOrders: [],
  staleOrdersCount: 0,
  pendingTickets: [],
  upcomingDeadlines: [],
  urgentDeadlinesCount: 0,
  lowStockProducts: [],
  customerCredits: [],
  customerCreditTotal: 0,
  pendingApprovals: [],
  queuedOperations: 0,
  printerState: 'NON_CONFIGUREE',
  lastUpdated: null,
  loading: true,
  partialError: false,
};

const AdminOperationsContext = createContext<AdminOperationsSnapshot | null>(null);

const toList = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const daysUntil = (value: string | Date | undefined): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
};

export const AdminOperationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { admin } = useAdminAuth();
  const role = admin?.role;
  const isOnline = useOnlineStatus();
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  const refreshLocalState = useCallback(async () => {
    const queue = await listQueuedSales().catch(() => []);
    let printerState: PrinterState = 'NON_CONFIGUREE';
    try {
      const printer = await import('../services/qzPrinter');
      const configured = Boolean(printer.getPrinterName());
      printerState = configured && printer.isConnected() ? 'PRETE' : configured ? 'CONFIGUREE' : 'NON_CONFIGUREE';
    } catch {
      printerState = 'NON_CONFIGUREE';
    }
    setSnapshot((current) => ({
      ...current,
      queuedOperations: queue.length,
      printerState,
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!isAdministrationRole(role)) {
      setSnapshot((current) => ({ ...current, loading: false }));
      return;
    }

    setSnapshot((current) => ({ ...current, loading: current.lastUpdated === null }));
    const calls: Promise<any>[] = [
      caisseJourApi.aujourdhui(),
      caisseApi.soldeGlobal(),
      commandeApi.getAll(),
      ticketApi.enAttente(),
      echeanceApi.getAVenir(7),
      produitApi.getLowStock(),
      clientApi.getCredits(),
    ];
    if (role === 'SUPER_ADMIN') calls.push(factureVirtuelleApi.getAll({ statut: 'EN_ATTENTE' }));

    const results = await Promise.allSettled(calls);
    const getValue = (index: number) => results[index]?.status === 'fulfilled'
      ? (results[index] as PromiseFulfilledResult<any>).value
      : undefined;

    const cashSession = getValue(0);
    const orders = toList(getValue(2)).filter((order) => order.statut === 'EN_ATTENTE');
    const staleLimit = Date.now() - 24 * 3_600_000;
    const deadlines = toList(getValue(4));
    const credits = toList(getValue(6));
    const approvals = role === 'SUPER_ADMIN' ? toList(getValue(7)) : [];

    setSnapshot((current) => ({
      ...current,
      cashSessionStatus: cashSession
        ? cashSession.statut === 'FERMEE' ? 'FERMEE' : 'OUVERTE'
        : results[0]?.status === 'rejected' ? 'ABSENTE' : 'INCONNUE',
      cashSessionBalance: Number(cashSession?.solde ?? 0),
      globalCashBalance: Number(getValue(1)?.total ?? 0),
      pendingOrders: orders,
      staleOrdersCount: orders.filter((order) => {
        const rawDate = order.dateCommande ?? order.createdAt;
        const time = rawDate ? new Date(rawDate).getTime() : Date.now();
        return time < staleLimit;
      }).length,
      pendingTickets: toList(getValue(3)),
      upcomingDeadlines: deadlines,
      urgentDeadlinesCount: deadlines.filter((deadline) => daysUntil(deadline.dateEcheance) <= 3).length,
      lowStockProducts: toList(getValue(5)),
      customerCredits: credits,
      customerCreditTotal: credits.reduce(
        (total, credit) => total + Number(credit.totalDu ?? credit.solde ?? credit.montantRestant ?? 0),
        0,
      ),
      pendingApprovals: approvals.filter((approval) => !approval.statut || approval.statut === 'EN_ATTENTE'),
      lastUpdated: new Date(),
      loading: false,
      partialError: results.some((result) => result.status === 'rejected'),
    }));
    await refreshLocalState();
  }, [refreshLocalState, role]);

  useEffect(() => {
    void refresh();
    if (!isAdministrationRole(role)) return;
    const interval = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(interval);
  }, [refresh, role]);

  useEffect(() => {
    const handleQueueChange = () => void refreshLocalState();
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
  }, [refreshLocalState]);

  const value = useMemo<AdminOperationsSnapshot>(() => ({ ...snapshot, refresh }), [refresh, snapshot]);

  return <AdminOperationsContext.Provider value={value}>{children}</AdminOperationsContext.Provider>;
};

export const useAdminOperations = () => {
  const value = useContext(AdminOperationsContext);
  if (!value) throw new Error('useAdminOperations doit être utilisé dans AdminOperationsProvider');
  return value;
};

export const useShopConnectionStatus = () => useOnlineStatus();
