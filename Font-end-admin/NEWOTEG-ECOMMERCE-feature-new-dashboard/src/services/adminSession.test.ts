import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearAdminSession,
  getAdminToken,
  getStoredAdmin,
  storeAdminSession,
} from './adminSession';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test('utilise sessionStorage lorsque localStorage est bloqué', () => {
  const sessionStorage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error('local storage disabled');
      },
      sessionStorage,
    },
  });

  clearAdminSession();
  assert.equal(storeAdminSession('token-session', { nom: 'Vendeur Test' }), 'session');
  assert.equal(getAdminToken(), 'token-session');
  assert.deepEqual(getStoredAdmin(), { nom: 'Vendeur Test' });
  clearAdminSession();
});

test('garde la session en mémoire lorsque tout stockage navigateur est bloqué', () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error('local storage disabled');
      },
      get sessionStorage() {
        throw new Error('session storage disabled');
      },
    },
  });

  clearAdminSession();
  assert.equal(storeAdminSession('token-memory', { nom: 'Caissier Test' }), 'memory');
  assert.equal(getAdminToken(), 'token-memory');
  assert.deepEqual(getStoredAdmin(), { nom: 'Caissier Test' });
  clearAdminSession();
});
