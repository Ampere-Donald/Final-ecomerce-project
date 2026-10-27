import assert from 'node:assert/strict';
import test from 'node:test';
import { activateAppUpdate } from './appUpdate';

class WaitingWorker extends EventTarget {
  state: ServiceWorkerState = 'installed';
  messages: unknown[] = [];
  postMessage(message: unknown) { this.messages.push(message); }
  transition(state: ServiceWorkerState) { this.state = state; this.dispatchEvent(new Event('statechange')); }
}
const registration = (waiting: WaitingWorker | null) => ({
  waiting: waiting as unknown as ServiceWorker,
  active: {} as ServiceWorker,
});

test('a confirmed update waits for activation without relying on a controlling event', async () => {
  const worker = new WaitingWorker();
  let reloads = 0;
  const update = activateAppUpdate(registration(worker), () => { reloads++; });
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
  worker.transition('activating');
  await Promise.resolve();
  assert.equal(reloads, 0);
  worker.transition('activated');
  await update;
  assert.equal(reloads, 1);
});

test('another tab may have already activated the waiting update', async () => {
  let reloads = 0;
  await activateAppUpdate(registration(null), () => { reloads++; });
  assert.equal(reloads, 1);
});

test('an unavailable or redundant worker never reloads the current form', async () => {
  const reload = () => { throw new Error('Must preserve current page'); };
  await assert.rejects(activateAppUpdate(undefined, reload), /enregistrée/);
  const worker = new WaitingWorker();
  const update = activateAppUpdate(registration(worker), reload);
  worker.transition('redundant');
  await assert.rejects(update, /interrompue/);
});
