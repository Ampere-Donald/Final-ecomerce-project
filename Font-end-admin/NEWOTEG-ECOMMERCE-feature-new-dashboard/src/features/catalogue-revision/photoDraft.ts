// Blobs stay on this device and are keyed by account and product, like text drafts.
const key = (user: string, product: string) => `${user}:${product}`;
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('newoteg-catalogue-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function photoDraft(user: string, product: string, value?: Blob | null): Promise<Blob | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('photos', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('photos');
      const request = value === undefined ? store.get(key(user, product)) : value === null ? store.delete(key(user, product)) : store.put(value, key(user, product));
      tx.oncomplete = () => resolve(value === undefined ? request.result || null : value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
