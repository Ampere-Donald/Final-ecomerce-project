const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { startPreproduction } = require('../../scripts/start-preproduction.cjs');
function simulate(statuses, calls) {
  return (_node, args, options) => {
    calls.push({ args, options });
    const child = new EventEmitter();
    queueMicrotask(() => child.emit('close', statuses[calls.length - 1], null));
    return child;
  };
}
test('a failed migration never starts the application or a fallback repair', async () => {
  const calls = [];
  assert.equal(
    await startPreproduction(simulate([1], calls), new EventEmitter()),
    1,
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args.slice(1), ['migrate', 'deploy']);
});
test('a schema check failure prevents server startup', async () => {
  const calls = [];
  assert.equal(
    await startPreproduction(simulate([0, 1], calls), new EventEmitter()),
    1,
  );
  assert.equal(calls.length, 2);
  assert.match(calls[1].args[0], /verify-release-schema/);
});
test('server starts after both checks, with duplicate startup migrations disabled', async () => {
  const calls = [];
  assert.equal(
    await startPreproduction(simulate([0, 0, 0], calls), new EventEmitter()),
    0,
  );
  assert.equal(calls.length, 3);
  assert.match(calls[2].args[0], /main.js$/);
  assert.equal(calls[2].options.env.RUN_PRISMA_MIGRATIONS, 'false');
});
for (const stage of [1, 3]) {
  test(`SIGTERM reaches child during stage ${stage} and prevents further startup`, async () => {
    const signals = new EventEmitter();
    let calls = 0;
    const sent = [];
    const result = await startPreproduction(() => {
      calls++;
      const child = new EventEmitter();
      child.kill = (signal) => {
        sent.push(signal);
        queueMicrotask(() => child.emit('close', null, signal));
      };
      queueMicrotask(() =>
        calls === stage
          ? signals.emit('SIGTERM')
          : child.emit('close', 0, null),
      );
      return child;
    }, signals);
    assert.equal(result, 143);
    assert.equal(calls, stage);
    assert.deepEqual(sent, ['SIGTERM']);
    assert.equal(signals.listenerCount('SIGTERM'), 0);
    assert.equal(signals.listenerCount('SIGINT'), 0);
  });
}
test('spawn failure fails closed and releases signal handlers', async () => {
  const signals = new EventEmitter();
  let calls = 0;
  const result = await startPreproduction(() => {
    calls++;
    const child = new EventEmitter();
    queueMicrotask(() => child.emit('error', new Error('spawn unavailable')));
    return child;
  }, signals);
  assert.equal(result, 1);
  assert.equal(calls, 1);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
});
