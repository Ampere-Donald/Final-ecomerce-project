import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySynchronizationError,
  processQueuedOperations,
  type QueuedSale,
} from './offlineSalesQueue';

const operation = (id: string, minute: number): QueuedSale => ({
  id,
  kind: 'VENTE',
  payload: { idempotencyKey: id },
  createdAt: `2026-07-13T10:${String(minute).padStart(2, '0')}:00.000Z`,
  attempts: 0,
  state: 'PENDING',
});

test('coupure avant envoi : conserve la première opération et arrête la file', async () => {
  const removed: string[] = [];
  const updated: QueuedSale[] = [];
  const result = await processQueuedOperations(
    [operation('a', 0), operation('b', 1)],
    async () => { throw new Error('Network unavailable'); },
    async (id) => { removed.push(id); },
    async (item) => { updated.push(item); },
    () => false,
  );
  assert.deepEqual(result, { synchronized: 0, failed: 1, conflicts: 0 });
  assert.deepEqual(removed, []);
  assert.equal(updated[0].state, 'RETRY');
});

test('coupure pendant envoi : retire uniquement les opérations confirmées', async () => {
  const removed: string[] = [];
  const updated: QueuedSale[] = [];
  let calls = 0;
  const result = await processQueuedOperations(
    [operation('a', 0), operation('b', 1), operation('c', 2)],
    async () => { calls += 1; if (calls === 2) throw new Error('socket closed'); },
    async (id) => { removed.push(id); },
    async (item) => { updated.push(item); },
    () => false,
  );
  assert.deepEqual(result, { synchronized: 1, failed: 1, conflicts: 0 });
  assert.deepEqual(removed, ['a']);
  assert.equal(updated[0].id, 'b');
  assert.equal(calls, 2);
});

test('retour du réseau : synchronise chaque identifiant une seule fois', async () => {
  const removed: string[] = [];
  const sent: string[] = [];
  const result = await processQueuedOperations(
    [operation('b', 1), operation('a', 0)],
    async (_kind, payload) => { sent.push(String(payload.idempotencyKey)); },
    async (id) => { removed.push(id); },
    async () => undefined,
    () => true,
  );
  assert.deepEqual(result, { synchronized: 2, failed: 0, conflicts: 0 });
  assert.deepEqual(sent, ['a', 'b']);
  assert.deepEqual(removed, ['a', 'b']);
});

test('stock insuffisant : classe le refus en conflit traitable', () => {
  const detail = classifySynchronizationError({
    response: { status: 409, data: { message: 'Stock insuffisant pour ce produit' } },
  });
  assert.deepEqual(detail, {
    state: 'CONFLICT',
    code: 'STOCK_CONFLICT',
    message: 'Stock insuffisant pour ce produit',
  });
});

test('échec serveur : envoie seulement le diagnostic technique et marque le rapport', async () => {
  const updated: QueuedSale[] = [];
  const reports: Array<{ id: string; code: string }> = [];
  await processQueuedOperations(
    [operation('a', 0)],
    async () => { throw { response: { status: 409, data: { message: 'Stock insuffisant' } } }; },
    async () => undefined,
    async (item) => { updated.push(item); },
    () => true,
    async (item, detail) => { reports.push({ id: item.id, code: detail.code }); },
  );
  assert.deepEqual(reports, [{ id: 'a', code: 'STOCK_CONFLICT' }]);
  assert.equal(updated[0].diagnosticReported, true);
});
