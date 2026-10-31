import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreRoutePosition } from '../src/storefront/routeScroll.js';

test('guide anchors win over page reset while native history keeps its saved position', () => {
  let resets = 0, anchor = 0;
  const win = { scrollTo: () => resets++ };
  const doc = { getElementById: id => id === 'comparaison' ? { scrollIntoView: () => anchor++ } : null };
  restoreRoutePosition(win, doc, '#comparaison', 'POP');
  restoreRoutePosition(win, doc, '', 'POP');
  assert.equal(anchor, 1); assert.equal(resets, 0);
  restoreRoutePosition(win, doc, '', 'PUSH');
  assert.equal(resets, 1);
  assert.doesNotThrow(() => restoreRoutePosition(win, doc, '#%invalid', 'PUSH'));
});

test('lazy anchors are revealed once they exist and navigation cancels the observer', () => {
  let callback, present = false, revealed = 0, disconnected = 0, cancelled = 0;
  const win = { MutationObserver: class {
    constructor(onChange) { callback = onChange; }
    observe() {}
    disconnect() { disconnected++; }
  }, setTimeout: () => 1, clearTimeout: () => cancelled++ };
  const doc = { body: {}, getElementById: id => present && id === 'table' ? { scrollIntoView: () => revealed++ } : null };
  const cleanup = restoreRoutePosition(win, doc, '#table', 'PUSH');
  assert.equal(revealed, 0);
  present = true; callback();
  assert.equal(revealed, 1); assert.equal(disconnected, 1); assert.equal(cancelled, 1);
  cleanup(); assert.equal(disconnected, 2);
});
