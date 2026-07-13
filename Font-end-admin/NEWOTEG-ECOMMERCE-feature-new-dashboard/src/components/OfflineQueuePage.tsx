import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Trash2, Wifi } from 'lucide-react';
import { bonVenteApi, ticketApi, venteApi } from '../services/api';
import {
  listQueuedSales,
  OFFLINE_POLICY,
  OFFLINE_QUEUE_EVENT,
  removeQueuedSale,
  synchronizeQueuedSales,
  type OfflineOperationKind,
  type QueuedSale,
} from '../services/offlineSalesQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { errorMessage, useToast } from './ui/Toast';

const kindLabels: Record<OfflineOperationKind, string> = {
  VENTE: 'Vente directe',
  BON: 'Bon vendeur',
  TICKET: 'Ticket caisse',
};

function operationAmount(item: QueuedSale): string {
  const value = item.payload.montantTotal ?? item.payload.total ?? item.payload.montant;
  return typeof value === 'number'
    ? `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
    : 'Montant calculé au serveur';
}

export function OfflineQueuePage() {
  const isOnline = useOnlineStatus();
  const toast = useToast();
  const [items, setItems] = useState<QueuedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const queued = await listQueuedSales();
      setItems(queued.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    } catch (error) {
      toast.error(`Lecture de la file impossible : ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(OFFLINE_QUEUE_EVENT, onChange);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, onChange);
  }, [refresh]);

  const send = useCallback((kind: OfflineOperationKind, payload: Record<string, unknown>) => {
    if (kind === 'BON') return bonVenteApi.create(payload);
    if (kind === 'TICKET') return ticketApi.create(payload as any);
    return venteApi.create(payload);
  }, []);

  const synchronize = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const result = await synchronizeQueuedSales(send);
      await refresh();
      if (result.synchronized > 0) toast.success(`${result.synchronized} opération(s) synchronisée(s).`);
      if (result.failed > 0) toast.warning(`${result.failed} opération(s) nécessite(nt) une vérification.`);
    } catch (error) {
      toast.error(`Synchronisation impossible : ${errorMessage(error)}`);
    } finally {
      setSyncing(false);
    }
  };

  const discard = async (item: QueuedSale) => {
    if (!window.confirm(`Supprimer définitivement cette ${kindLabels[item.kind].toLowerCase()} de la file ?`)) return;
    await removeQueuedSale(item.id);
    toast.info('Opération retirée de la file hors ligne.');
  };

  const retryOne = async (item: QueuedSale) => {
    if (!isOnline || syncingId) return;
    setSyncingId(item.id);
    try {
      const result = await synchronizeQueuedSales(send, [item.id]);
      await refresh();
      if (result.synchronized === 1) toast.success('Opération synchronisée sans doublon.');
      else if (result.conflicts > 0) toast.warning('Le conflit de stock persiste. Corrigez le stock ou retirez l’opération après contrôle.');
      else toast.warning('Le serveur n’a pas encore accepté cette opération.');
    } catch (error) {
      toast.error(`Nouvelle tentative impossible : ${errorMessage(error)}`);
    } finally {
      setSyncingId(null);
    }
  };

  const failedCount = useMemo(() => items.filter((item) => item.lastError).length, [items]);
  const conflictCount = useMemo(() => items.filter((item) => item.state === 'CONFLICT').length, [items]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Continuité de service</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Opérations hors ligne</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Les ventes restent sur cet appareil jusqu’à leur confirmation par le serveur. Chaque identifiant est unique pour éviter les doublons.
          </p>
        </div>
        <button type="button" onClick={() => void synchronize()} disabled={!isOnline || syncing || items.length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Synchronisation…' : 'Tout synchroniser'}
        </button>
      </header>

      <aside className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        <p className="font-bold">Politique hors ligne</p>
        <p className="mt-1">Autorisées : ventes directes, bons vendeur et tickets caisse. Les crédits, inventaires, achats et modifications de stock exigent le serveur.</p>
        <p className="mt-2 text-xs text-sky-800">{OFFLINE_POLICY.stockRule} {OFFLINE_POLICY.orderingRule}</p>
      </aside>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="État de synchronisation">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Connexion</p>
          <p className={`mt-2 flex items-center gap-2 font-bold ${isOnline ? 'text-emerald-700' : 'text-red-700'}`}>
            {isOnline ? <Wifi size={18} /> : <CloudOff size={18} />}{isOnline ? 'Serveur accessible' : 'Mode hors ligne'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">En attente</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">À vérifier</p>
          <p className={`mt-2 text-2xl font-bold ${failedCount ? 'text-amber-700' : 'text-emerald-700'}`}>{failedCount}</p>
          {conflictCount > 0 && <p className="mt-1 text-xs font-bold text-red-700">dont {conflictCount} conflit{conflictCount > 1 ? 's' : ''} de stock</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">Chargement de la file…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-4 rounded-full bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 size={28} /></span>
            <h2 className="font-bold text-slate-900">Tout est synchronisé</h2>
            <p className="mt-1 text-sm text-slate-500">Aucune opération n’attend sur cet appareil.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className={`mt-0.5 w-fit rounded-xl p-2.5 ${item.state === 'CONFLICT' ? 'bg-red-50 text-red-700' : item.lastError ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.lastError ? <AlertTriangle size={20} /> : <CloudOff size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-bold text-slate-900">{kindLabels[item.kind] || item.kind}</h2>
                      <span className="text-sm font-semibold text-slate-700">{operationAmount(item)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Créée le {new Date(item.createdAt).toLocaleString('fr-FR')} · tentative(s) : {item.attempts}
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={item.id}>ID {item.id}</p>
                    {item.lastError && (
                      <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${item.state === 'CONFLICT' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}>
                        <span className="font-bold">{item.state === 'CONFLICT' ? 'Conflit de stock' : 'Nouvelle tentative requise'}{item.errorCode ? ` · ${item.errorCode}` : ''}</span><br />
                        {item.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:min-w-32">
                    <button type="button" onClick={() => void retryOne(item)} disabled={!isOnline || syncingId !== null}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      <RefreshCw size={15} className={syncingId === item.id ? 'animate-spin' : ''} /> Réessayer
                    </button>
                    <button type="button" onClick={() => void discard(item)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                      aria-label={`Supprimer ${kindLabels[item.kind] || item.kind} de la file`}>
                      <Trash2 size={15} /> Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
