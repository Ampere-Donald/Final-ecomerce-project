import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearActiveCartDraft,
  getActiveCartDraft,
  saveActiveCartDraft,
} from './cashierProductivity';

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

test('active cart draft can be saved, restored and cleared', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });

  const saved = saveActiveCartDraft(
    'seller-1',
    [{ produitId: 'p-1', quantite: 3 }],
    { paymentMethod: 'ESPECES' },
  );

  assert.equal(saved.items[0].quantite, 3);
  assert.deepEqual(getActiveCartDraft('seller-1'), saved);

  clearActiveCartDraft('seller-1');
  assert.equal(getActiveCartDraft('seller-1'), null);
});

test('active cart persistence never blocks a sale when storage is unavailable', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded'); },
      removeItem: () => { throw new Error('storage disabled'); },
    },
    configurable: true,
  });

  assert.doesNotThrow(() => saveActiveCartDraft('seller-2', [{ quantite: 1 }], {}));
  assert.doesNotThrow(() => clearActiveCartDraft('seller-2'));
});
