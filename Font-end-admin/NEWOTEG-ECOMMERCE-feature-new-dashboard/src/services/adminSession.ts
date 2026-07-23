const TOKEN_KEY = 'newoteg_admin_token';
const USER_KEY = 'newoteg_admin_user';

let memoryToken: string | null = null;
let memoryUser: string | null = null;

type StorageName = 'localStorage' | 'sessionStorage';

function getStorage(name: StorageName): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[name];
  } catch {
    return null;
  }
}

function read(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
}

function remove(storage: Storage | null): void {
  try {
    storage?.removeItem(TOKEN_KEY);
    storage?.removeItem(USER_KEY);
  } catch {
    // Certains navigateurs anciens exposent Storage mais refusent son accès.
  }
}

function write(storage: Storage | null, token: string, serializedUser: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, serializedUser);
    return true;
  } catch {
    remove(storage);
    return false;
  }
}

function clearPersistentSession(): void {
  remove(getStorage('localStorage'));
  remove(getStorage('sessionStorage'));
}

export function getAdminToken(): string | null {
  return (
    memoryToken ||
    read(getStorage('localStorage'), TOKEN_KEY) ||
    read(getStorage('sessionStorage'), TOKEN_KEY)
  );
}

export function getStoredAdmin<T>(): T | null {
  const serialized =
    memoryUser ||
    read(getStorage('localStorage'), USER_KEY) ||
    read(getStorage('sessionStorage'), USER_KEY);

  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as T;
  } catch {
    return null;
  }
}

export function storeAdminSession(token: string, user: unknown): 'local' | 'session' | 'memory' {
  const serializedUser = JSON.stringify(user);
  clearPersistentSession();
  memoryToken = token;
  memoryUser = serializedUser;

  if (write(getStorage('localStorage'), token, serializedUser)) return 'local';
  if (write(getStorage('sessionStorage'), token, serializedUser)) return 'session';
  return 'memory';
}

export function updateStoredAdmin(user: unknown): void {
  const token = getAdminToken();
  if (token) storeAdminSession(token, user);
}

export function clearAdminSession(): void {
  memoryToken = null;
  memoryUser = null;
  clearPersistentSession();
}
