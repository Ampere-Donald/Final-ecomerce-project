import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/sw-transition-20261024.js', import.meta.url), 'utf8');
function worker(names: string[], brokenCache = false) {
  const events: Record<string, (event: { waitUntil(p: Promise<unknown>): void }) => void> = {};
  let activations = 0;
  let markers = 0;
  vm.runInNewContext(source, {
    self: {
      registration: { scope: 'https://admin.newoteg.com/' },
      skipWaiting: async () => { activations++; },
      addEventListener: (type: string, handler: any) => { events[type] = handler; },
    },
    caches: {
      keys: async () => { if (brokenCache) throw new Error('storage unavailable'); return names; },
      open: async (name: string) => {
        assert.equal(name, 'newoteg-update-migration-v3');
        return { put: async () => { markers++; } };
      },
      delete: () => { throw new Error('Migration must not delete running app caches'); },
    },
    Response,
  });
  return {
    async fire(type: string) { let pending: Promise<unknown>; events[type]({ waitUntil: p => { pending = p; } }); await pending!; },
    get activations() { return activations; },
    get markers() { return markers; },
  };
}

test('a legacy installed page receives an active update without reloading or deleting its running cache', async () => {
  const app = worker(['workbox-precache-v2-https://admin.newoteg.com/', 'newoteg-offline-data-v1']);
  await app.fire('install');
  assert.equal(app.activations, 1);
  assert.equal(app.markers, 0); // A failed precache install must not mark migration complete.
  await app.fire('activate');
  assert.equal(app.markers, 1);
});

test('subsequent releases keep the explicit update prompt even if an old cache remains', async () => {
  const app = worker(['workbox-precache-v2-https://admin.newoteg.com/', 'newoteg-update-migration-v3']);
  await app.fire('install');
  assert.equal(app.activations, 0);
});

test('fresh installs and blocked cache storage do not force an update', async () => {
  for (const app of [worker([]), worker([], true)]) {
    await app.fire('install');
    assert.equal(app.activations, 0);
  }
});
