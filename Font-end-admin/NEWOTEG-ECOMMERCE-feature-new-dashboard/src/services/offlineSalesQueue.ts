const DB_NAME = 'newoteg-offline';
const DB_VERSION = 1;
const STORE_NAME = 'sales';
export const OFFLINE_QUEUE_EVENT = 'newoteg:offline-queue';
export const OFFLINE_SYNC_COMPLETED_EVENT = 'newoteg:offline-synchronized';

const notifyQueueChanged = () => window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));

export type OfflineOperationKind = 'VENTE' | 'BON' | 'TICKET';

export type QueuedSale = {
  id: string;
  kind: OfflineOperationKind;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export function newSaleId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
  const queued: QueuedSale = { id, kind, payload: { ...payload, idempotencyKey: id }, createdAt: new Date().toISOString(), attempts: 0 };
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

export async function synchronizeQueuedSales(
  send: (kind: OfflineOperationKind, payload: Record<string, unknown>) => Promise<unknown>,
): Promise<{ synchronized: number; failed: number }> {
  const queued = (await listQueuedSales()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let synchronized = 0;
  let failed = 0;

  for (const sale of queued) {
    try {
      await send(sale.kind || 'VENTE', sale.payload);
      await removeQueuedSale(sale.id);
      synchronized += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Synchronisation refusée';
      await updateQueuedSale({ ...sale, attempts: sale.attempts + 1, lastError: message });
      if (!navigator.onLine) break;
    }
  }
  if (synchronized > 0) {
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_COMPLETED_EVENT, {
      detail: { synchronized, failed },
    }));
  }
  return { synchronized, failed };
}
