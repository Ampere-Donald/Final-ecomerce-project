import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bonVenteApi, diagnosticApi, ticketApi, venteApi } from '../services/api';
import {
  listQueuedSales,
  OFFLINE_QUEUE_EVENT,
  synchronizeQueuedSales,
  type QueuedSale,
  type SynchronizationErrorDetail,
} from '../services/offlineSalesQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getWorkstationId } from '../services/workstation';

export function OfflineSyncStatus() {
  const isOnline = useOnlineStatus();
  const [queued, setQueued] = useState<QueuedSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => setQueued(await listQueuedSales()), []);

  const synchronize = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const reportFailure = (item: QueuedSale, detail: SynchronizationErrorDetail) => diagnosticApi.record({
        action: 'SYNC_FAILURE',
        code: detail.code,
        operationKind: item.kind,
        operationId: item.id,
        workstationId: getWorkstationId(),
        state: detail.state,
      });
      await synchronizeQueuedSales((kind, payload) => {
        if (kind === 'BON') return bonVenteApi.create(payload);
        if (kind === 'TICKET') return ticketApi.create(payload as any);
        return venteApi.create(payload);
      }, undefined, reportFailure);
      await refresh();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const handleQueueChange = () => void refresh();
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
  }, [refresh]);

  useEffect(() => {
    if (isOnline) void synchronize();
  }, [isOnline, synchronize]);

  if (queued.length === 0 && isOnline) return null;
  const failed = queued.filter((item) => item.lastError).length;

  return (
    <div className={`border-b px-4 py-2.5 text-sm ${isOnline ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-900'}`} role="status">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center">
        <CloudOff size={17} className="shrink-0" />
        <p className="flex-1 font-semibold">
          {!isOnline ? 'Hors ligne' : `${queued.length} opération(s) en attente`}
          {failed > 0 ? ` — ${failed} à vérifier` : ''}
        </p>
        {queued.length > 0 && (
          <div className="flex items-center gap-2">
            <Link to="/offline-queue" className="rounded-lg border border-current/20 px-3 py-1.5 text-xs font-bold hover:bg-white/60">
              Voir la file
            </Link>
            <button type="button" onClick={() => void synchronize()} disabled={!isOnline || syncing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Synchronisation…' : 'Synchroniser'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
