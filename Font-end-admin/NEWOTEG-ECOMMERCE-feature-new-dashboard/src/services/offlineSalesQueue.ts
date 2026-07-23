import { createClientId } from '../utils/clientId';

const DB_NAME = 'newoteg-offline';
const DB_VERSION = 1;
const STORE_NAME = 'sales';
export const OFFLINE_QUEUE_EVENT = 'newoteg:offline-queue';
export const OFFLINE_SYNC_COMPLETED_EVENT = 'newoteg:offline-synchronized';

const notifyQueueChanged = () => window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));

export type OfflineOperationKind = 'VENTE' | 'BON' | 'TICKET';
export type OfflineOperationState = 'PENDING' | 'RETRY' | 'CONFLICT';

export const OFFLINE_POLICY = {
  allowed: ['VENTE', 'BON', 'TICKET'] as OfflineOperationKind[],
  stockRule: 'Le stock affiché hors ligne est indicatif. Le serveur reste l’autorité et refuse la synchronisation si le stock réel est insuffisant.',
  orderingRule: 'Les opérations sont envoyées de la plus ancienne à la plus récente avec un identifiant idempotent.',
} as const;

export type QueuedSale = {
  id: string;
  kind: OfflineOperationKind;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  state?: OfflineOperationState;
  errorCode?: string;
  lastError?: string;
  diagnosticReported?: boolean;
};

export type SynchronizationErrorDetail = {
  state: Exclude<OfflineOperationState, 'PENDING'>;
  code: string;
  message: string;
};

export function newSaleId(): string {
  return createClientId('sale');
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function enqueueOperation(kind: OfflineOperationKind, payload: Record<string, unknown>): Promise<QueuedSale> {
  const id = String(payload.idempotencyKey || newSaleId());
  const queued: QueuedSale = {
    id,
    kind,
    payload: { ...payload, idempotencyKey: id },
    createdAt: new Date().toISOString(),
    attempts: 0,
    state: 'PENDING',
  };
  await withStore('readwrite', (store) => store.put(queued));
  notifyQueueChanged();
  return queued;
}

export const enqueueSale = (payload: Record<string, unknown>) => enqueueOperation('VENTE', payload);
export const enqueueBon = (payload: Record<string, unknown>) => enqueueOperation('BON', payload);
export const enqueueTicket = (payload: Record<string, unknown>) => enqueueOperation('TICKET', payload);

export function listQueuedSales(): Promise<QueuedSale[]> {
  return withStore('readonly', (store) => store.getAll());
}

async function updateQueuedSale(sale: QueuedSale): Promise<void> {
  await withStore('readwrite', (store) => store.put(sale));
  notifyQueueChanged();
}

export async function removeQueuedSale(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
  notifyQueueChanged();
}

export function classifySynchronizationError(error: unknown): SynchronizationErrorDetail {
  const candidate = error as {
    message?: string;
    response?: { status?: number; data?: { message?: string | string[]; code?: string } };
  };
  const serverMessage = candidate?.response?.data?.message;
  const message = Array.isArray(serverMessage)
    ? serverMessage.join(', ')
    : serverMessage || candidate?.message || 'Synchronisation refusée';
  const status = candidate?.response?.status;
  const conflict = status === 409 || /stock|quantit[eé].*(?:insuffisant|indisponible)|rupture/i.test(message);
  return conflict
    ? { state: 'CONFLICT', code: candidate?.response?.data?.code || 'STOCK_CONFLICT', message }
    : { state: 'RETRY', code: status ? `HTTP_${status}` : 'NETWORK_OR_SERVER', message };
}

export async function processQueuedOperations(
  queued: QueuedSale[],
  send: (kind: OfflineOperationKind, payload: Record<string, unknown>) => Promise<unknown>,
  remove: (id: string) => Promise<void>,
  update: (sale: QueuedSale) => Promise<void>,
  isOnline: () => boolean,
  reportFailure?: (sale: QueuedSale, detail: SynchronizationErrorDetail) => Promise<void>,
): Promise<{ synchronized: number; failed: number; conflicts: number }> {
  let synchronized = 0;
  let failed = 0;
  let conflicts = 0;

  for (const sale of [...queued].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    try {
      await send(sale.kind || 'VENTE', sale.payload);
      await remove(sale.id);
      synchronized += 1;
    } catch (error) {
      failed += 1;
      const detail = classifySynchronizationError(error);
      if (detail.state === 'CONFLICT') conflicts += 1;
      let diagnosticReported = false;
      if (reportFailure) {
        try {
          await reportFailure(sale, detail);
          diagnosticReported = true;
        } catch {
          // La panne peut empêcher le rapport ; il sera renvoyé au retour du réseau.
        }
      }
      await update({
        ...sale,
        attempts: sale.attempts + 1,
        state: detail.state,
        errorCode: detail.code,
        lastError: detail.message,
        diagnosticReported,
      });
      if (!isOnline()) break;
    }
  }
  return { synchronized, failed, conflicts };
}

export async function synchronizeQueuedSales(
  send: (kind: OfflineOperationKind, payload: Record<string, unknown>) => Promise<unknown>,
  onlyIds?: string[],
  reportFailure?: (sale: QueuedSale, detail: SynchronizationErrorDetail) => Promise<void>,
): Promise<{ synchronized: number; failed: number; conflicts: number }> {
  const all = await listQueuedSales();
  const queued = onlyIds?.length ? all.filter((sale) => onlyIds.includes(sale.id)) : all;
  if (reportFailure) {
    for (const sale of queued.filter((item) => item.lastError && !item.diagnosticReported)) {
      const detail: SynchronizationErrorDetail = {
        state: sale.state === 'CONFLICT' ? 'CONFLICT' : 'RETRY',
        code: sale.errorCode || 'NETWORK_OR_SERVER',
        message: sale.lastError || 'Synchronisation refusée',
      };
      try {
        await reportFailure(sale, detail);
        sale.diagnosticReported = true;
        await updateQueuedSale(sale);
      } catch {
        break;
      }
    }
  }
  const result = await processQueuedOperations(
    queued,
    send,
    removeQueuedSale,
    updateQueuedSale,
    () => navigator.onLine,
    reportFailure,
  );
  if (result.synchronized > 0) {
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_COMPLETED_EVENT, { detail: result }));
  }
  return result;
}
