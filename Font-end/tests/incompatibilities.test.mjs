import test from 'node:test';
import assert from 'node:assert/strict';
import { clearIssueAttempts, guestIssueOrder, issueContent, issuePurchases, readIssueAttempt, saveIssueAttempt } from '../src/storefront/incompatibilityData.js';
const id = '0634b3a5-6e4e-48aa-8047-f94bc988c1f3', requestId = '21287bd0-cb21-440e-8dc5-47ce89f9cc89';
const content = { quantite: 2, motif: 'BROCHAGE', description: 'Les broches diffèrent du montage.' };
function storage() { const map = new Map(); return { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k), get length() { return map.size; }, key: i => [...map.keys()][i] }; }
test('durable closed attempts keep private proof but never code, JWT, errors or another account scope', () => {
  const store = storage(), value = { scope: 'guest:private:' + id, mode: 'guest', orderId: id, body: { requestId, ligneCommandeId: id, ...content, code: '12345678' }, accessToken: 'a'.repeat(43), actionKey: 'b'.repeat(43), challengeId: requestId, code: '12345678', token: 'private-jwt', error: 'private-error' };
  const saved = saveIssueAttempt(value, store);
  assert.deepEqual(readIssueAttempt(value.scope, store), saved);
  assert.equal(readIssueAttempt('account:another:' + id, store), null);
  const serialized = store.getItem(store.key(0));
  for (const secret of ['12345678', 'private-jwt', 'private-error']) assert.ok(!serialized.includes(secret));
  assert.equal(guestIssueOrder(value.accessToken, store), id);
  clearIssueAttempts('guest', store); assert.equal(store.length, 0);
  assert.throws(() => saveIssueAttempt(value, { setItem() {}, getItem() { return null; } }));
});
test('purchase proof rejects wrong orders, duplicate lines and incoherent returned quantity', () => {
  const issue = { id: requestId, ligneCommandeId: id, ...content, statut: 'RETOUR_CONFIRME', version: 2, createdAt: '2026-10-04T08:00:00Z', reponseBoutique: null, retourQuantite: 1, retourConfirmeAt: '2026-10-04T09:00:00Z' };
  const base = { commandeId: id, eligible: true, codeAvailable: false, lignes: [{ id, nomProduit: 'Pièce fictive', quantite: 2, incompatibilite: issue }] };
  assert.equal(issuePurchases(base, id, true), base);
  assert.throws(() => issuePurchases(base, requestId, true));
  assert.throws(() => issuePurchases({ ...base, lignes: [...base.lignes, ...base.lignes] }, id, true));
  assert.throws(() => issuePurchases({ ...base, lignes: [{ ...base.lignes[0], incompatibilite: { ...issue, retourQuantite: 3 } }] }, id, true));
  for (const value of [{ quantite: '2' }, { quantite: 0 }, { motif: 'remboursement' }, { description: '    ' }, { description: 'Texte privé\u0000' }]) assert.throws(() => issueContent({ ...content, ...value }));
});
