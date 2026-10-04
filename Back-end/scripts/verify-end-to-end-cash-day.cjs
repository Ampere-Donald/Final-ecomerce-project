// Deterministic overlap of real HTTP reads on this run's disposable PostgreSQL.
const assert = require('node:assert/strict');

module.exports = async ({ app, db, api, adminToken, admin, ok }) => {
  const [identity] = await db.$queryRawUnsafe(
    'SELECT current_database() AS name',
  );
  assert.match(identity.name, /^newoteg_e2e_[a-f0-9]{32}$/);
  assert.equal(await db.caisseJour.count(), 0);
  const {
    CaisseJourService,
  } = require('../dist/src/caisse-jour/caisse-jour.service');
  const service = app.get(CaisseJourService);
  const original = service.db;
  let reads = 0,
    release,
    emptyDay = true;
  let rendezvous = new Promise((resolve) => {
    release = resolve;
  });
  const delegate = original.caisseJour;
  const overlapped = new Proxy(delegate, {
    get(target, prop) {
      if (prop !== 'findUnique') return target[prop];
      return async (...args) => {
        // Do not fabricate reads: both SQL queries see the initially empty day.
        const result = await delegate.findUnique(...args);
        if (reads < 2) {
          if (emptyDay) assert.equal(result, null);
          else assert.equal(result.caissierId, null);
          if (++reads === 2) release();
          await rendezvous;
        }
        return result;
      };
    },
  });
  service.db = new Proxy(original, {
    get(target, prop) {
      return prop === 'caisseJour' ? overlapped : target[prop];
    },
  });
  let results;
  try {
    results = await Promise.allSettled([
      api('GET', '/caisse-jour/aujourdhui', undefined, adminToken),
      api('GET', '/caisse-jour/aujourdhui', undefined, adminToken),
    ]);
  } finally {
    service.db = original;
  }
  assert.equal(reads, 2);
  assert.ok(
    results.every((r) => r.status === 'fulfilled'),
    'Both simultaneous shop reads must succeed: ' +
      results.map((r) => r.status).join(', '),
  );
  assert.equal(results[0].value.id, results[1].value.id);
  assert.equal(results[0].value.solde, 0);
  assert.equal(results[1].value.solde, 0);
  assert.equal(await db.caisseJour.count(), 1);
  assert.equal(
    await db.caisse.count(),
    0,
    'Opening a day is not an encashment',
  );

  const id = results[0].value.id;
  reads = 0;
  emptyDay = false;
  rendezvous = new Promise((resolve) => {
    release = resolve;
  });
  service.db = new Proxy(original, {
    get(target, prop) {
      return prop === 'caisseJour' ? overlapped : target[prop];
    },
  });
  let first, second;
  try {
    [first, second] = await Promise.all([
      service.getOrCreateToday(admin.id),
      service.getOrCreateToday('other-fixture-cashier'),
    ]);
  } finally {
    service.db = original;
  }
  assert.equal(reads, 2);
  assert.equal(first.id, id);
  assert.equal(second.id, id);
  assert.equal(
    first.caissierId,
    second.caissierId,
    'A simultaneous cashier cannot overwrite the first assignment',
  );
  const assigned = await db.caisseJour.findUniqueOrThrow({ where: { id } });
  assert.ok([admin.id, 'other-fixture-cashier'].includes(assigned.caissierId));
  await service.getOrCreateToday(
    assigned.caissierId === admin.id ? 'other-fixture-cashier' : admin.id,
  );
  assert.equal(
    (await db.caisseJour.findUniqueOrThrow({ where: { id } })).caissierId,
    assigned.caissierId,
  );
  const before = await db.caisseJour.update({
    where: { id },
    data: { statut: 'FERMEE', fermetureAt: new Date(), soldeCloture: 0 },
  });
  assert.deepEqual(
    await service.getOrCreateToday(),
    before,
    'Read must never reopen or rewrite a closed day',
  );
  assert.equal(await db.caisse.count(), 0);
  // Reset only the fixture row so subsequent pickup recipe has its normal open day.
  await db.caisseJour.update({
    where: { id },
    data: {
      statut: 'OUVERTE',
      fermetureAt: null,
      soldeCloture: null,
      caissierId: null,
    },
  });
  ok(
    'Two concurrent real shop requests share one cash day without failed response or encashment; cashier assignment is retained and closed day remains closed',
  );
};
