// No .env; refuse every database except the dedicated local fixture cluster.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const connectionString = process.env.NEWOTEG_GUEST_TEST_DATABASE_URL;
if (!connectionString) throw Error('Explicit isolated database URL required');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error('Refusing database outside dedicated local fixture cluster');
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { guestTokenHash } = require('../dist/src/commande/guest-access');
const {
  GuestActionService,
} = require('../dist/src/commande/guest-action.service');
const {
  GuestChallengeMaintenanceService,
} = require('../dist/src/commande/guest-challenge-maintenance.service');
const pool = new Pool({ connectionString, max: 8 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const service = new GuestChallengeMaintenanceService(db);
const fixtures = [],
  references = [],
  checks = [];
const now = new Date(),
  hour = 3600000,
  day = 24 * hour;
const ago = (ms) => new Date(now.getTime() - ms);
const mail = {
  messages: [],
  guestRecoveryAvailable: () => true,
  async sendGuestActionCode(to, code) {
    this.messages.push({ to, code });
    return true;
  },
};
const actions = new GuestActionService(db, mail);
const output =
  'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/guest-maintenance/result.json';
function ok(name) {
  checks.push(name);
  console.log('PASS ' + name);
}
async function fixture() {
  const token = randomBytes(32).toString('base64url');
  const order = await db.commande.create({
    data: {
      numeroSuivi: 'MAINT-' + randomUUID().slice(0, 18),
      nomClient: 'Fixture entretien',
      telephone: '600000000',
      adresseLivraison: 'Fixture locale',
      montantTotal: 0,
      statut: 'EN_LIVRAISON',
      modeReception: 'LIVRAISON',
      guestAccess: {
        create: {
          tokenHash: guestTokenHash(token),
          recoveryEmail: 'fixture@example.invalid',
          expiresAt: new Date(now.getTime() + 30 * day),
        },
      },
    },
  });
  fixtures.push(order.id);
  references.push(order.numeroSuivi);
  return { order, token };
}
async function challenge(id, data = {}) {
  return db.commandeGuestChallenge.create({
    data: {
      commandeId: id,
      codeHash: '0'.repeat(64),
      createdAt: ago(2 * day),
      expiresAt: ago(2 * day),
      ...data,
    },
  });
}
(async () => {
  try {
    if (process.env.NEWOTEG_GUEST_APPLY_SCHEMA === 'true') {
      const sql = fs.readFileSync(
        path.join(
          __dirname,
          '../prisma/migrations/20261003120000_guest_challenge_cleanup/migration.sql',
        ),
        'utf8',
      );
      assert.ok(!/\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE)\b/i.test(sql));
      await pool.query(
        sql.replaceAll('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS '),
      );
    }
    const f = await fixture(),
      outside = await fixture();
    await challenge(outside.order.id);
    const old = await challenge(f.order.id);
    const kept = await Promise.all([
      challenge(f.order.id, { expiresAt: ago(day) }),
      challenge(f.order.id, {
        createdAt: ago(10 * 60000),
        expiresAt: ago(60000),
        consumedAt: ago(60000),
      }),
      challenge(f.order.id, { expiresAt: new Date(now.getTime() + hour) }),
      challenge(f.order.id, { createdAt: ago(30 * 60000) }),
      challenge(f.order.id, { completedAt: ago(29 * day) }),
      challenge(f.order.id, {
        completedAt: ago(31 * day),
        createdAt: ago(30 * 60000),
      }),
    ]);
    const expiredReceipt = await challenge(f.order.id, {
      completedAt: ago(30 * day),
    });
    const before = await db.commande.findUnique({
      where: { id: f.order.id },
      include: { guestAccess: true },
    });
    assert.equal(await service.prune(now, [f.order.id]), 2);
    assert.equal(
      await db.commandeGuestChallenge.count({
        where: { id: { in: kept.map((c) => c.id) } },
      }),
      kept.length,
    );
    assert.equal(
      await db.commandeGuestChallenge.count({
        where: { id: { in: [old.id, expiredReceipt.id] } },
      }),
      0,
    );
    assert.equal(
      await db.commandeGuestChallenge.count({
        where: { commandeId: outside.order.id },
      }),
      1,
    );
    assert.deepEqual(
      await db.commande.findUnique({
        where: { id: f.order.id },
        include: { guestAccess: true },
      }),
      before,
    );
    ok(
      'Retention boundaries, last-hour budget, scope and unchanged order/grant',
    );

    const receipt = await fixture();
    const requested = await actions.request(receipt.token, 'RECEIVE');
    const actionKey = randomBytes(32).toString('base64url');
    const result = await actions.execute(
      receipt.token,
      'RECEIVE',
      requested.challengeId,
      actionKey,
      mail.messages.at(-1).code,
    );
    await db.commandeGuestChallenge.update({
      where: { id: requested.challengeId },
      data: {
        completedAt: ago(29 * day),
        createdAt: ago(29 * day),
        expiresAt: ago(29 * day),
      },
    });
    assert.equal(await service.prune(now, [receipt.order.id]), 0);
    assert.deepEqual(
      await actions.execute(
        receipt.token,
        'RECEIVE',
        requested.challengeId,
        actionKey,
      ),
      result,
    );
    await db.commandeGuestChallenge.update({
      where: { id: requested.challengeId },
      data: { completedAt: ago(31 * day) },
    });
    assert.equal(await service.prune(now, [receipt.order.id]), 1);
    await assert.rejects(
      actions.execute(
        receipt.token,
        'RECEIVE',
        requested.challengeId,
        actionKey,
      ),
    );
    ok(
      'Real receive receipt replays at 29 days, expires and is removed after 30 days',
    );

    const budget = await fixture();
    for (let i = 0; i < 3; i++)
      await challenge(budget.order.id, {
        purpose: ['RECOVER', 'LINK', 'RECEIVE'][i],
        createdAt: ago((i + 2) * 60000),
        expiresAt: ago(60000),
      });
    assert.equal(await service.prune(now, [budget.order.id]), 0);
    const sends = mail.messages.length;
    await assert.rejects(
      actions.request(budget.token, 'RECEIVE'),
      (e) => e.getStatus?.() === 429,
    );
    assert.equal(mail.messages.length, sends);
    ok(
      'Shared three-code hourly limit survives cleanup without any new message',
    );

    const locked = await fixture(),
      row = await challenge(locked.order.id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT id FROM commande_guest_challenge WHERE id=$1 FOR UPDATE',
        [row.id],
      );
      assert.equal(await service.prune(now, [locked.order.id]), 0);
      await client.query('COMMIT');
      assert.equal(await service.prune(now, [locked.order.id]), 1);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
    ok('Locked rows are skipped and removed on a later run');

    const concurrent = await fixture();
    await db.commandeGuestChallenge.createMany({
      data: Array.from({ length: 200 }, () => ({
        commandeId: concurrent.order.id,
        codeHash: '0'.repeat(64),
        createdAt: ago(2 * day),
        expiresAt: ago(2 * day),
      })),
    });
    const counts = await Promise.all([
      service.prune(now, [concurrent.order.id]),
      new GuestChallengeMaintenanceService(db).prune(now, [
        concurrent.order.id,
      ]),
    ]);
    assert.equal(
      counts.reduce((a, b) => a + b),
      200,
    );
    ok('Concurrent cleaners delete each row only once');

    const batch = await fixture();
    await db.commandeGuestChallenge.createMany({
      data: Array.from({ length: 2105 }, () => ({
        commandeId: batch.order.id,
        codeHash: '0'.repeat(64),
        createdAt: ago(2 * day),
        expiresAt: ago(2 * day),
      })),
    });
    assert.equal(await service.prune(now, [batch.order.id]), 2000);
    assert.equal(await service.prune(now, [batch.order.id]), 105);
    assert.equal(await service.prune(now, []), 0);
    ok('Maximum 2000 rows per run with remaining rows handled next time');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(
      output,
      JSON.stringify(
        {
          success: true,
          checks,
          database: 'dedicated local fixture only',
          messages: 'captured transport only, no external sends',
          scheduledCleanupEnabled: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.notification.deleteMany({
      where: {
        OR: references.map((reference) => ({
          message: { contains: reference },
        })),
      },
    });
    await db.commande.deleteMany({ where: { id: { in: fixtures } } });
    await db.$disconnect();
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
