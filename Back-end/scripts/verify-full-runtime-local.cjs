// Starts the actual built main/AppModule, not a reduced TestingModule.
// Owned local database, empty working directory and explicit provider-free env.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomBytes, randomUUID } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { readReleaseContract } = require('./release-schema-contract.cjs');

const source = process.env.NEWOTEG_RUNTIME_TEST_DATABASE_URL;
const parsed = source ? new URL(source) : null;
if (
  !parsed ||
  parsed.protocol !== 'postgresql:' ||
  parsed.hostname !== '127.0.0.1' ||
  parsed.port !== '55439' ||
  parsed.pathname !== '/postgres' ||
  parsed.username !== 'quote_test'
)
  throw Error(
    'Dedicated local quote_test cluster must be explicitly selected.',
  );
const root = path.resolve(__dirname, '..');
const id = randomUUID().replaceAll('-', '');
const database = 'newoteg_runtime_' + id;
assert.match(database, /^newoteg_runtime_[a-f0-9]{32}$/);
const url = new URL(source);
url.pathname = '/' + database;
const output = path.resolve(
  process.env.NEWOTEG_RUNTIME_TEST_OUTPUT ||
    path.join(root, '.local-postgres/full-runtime', id),
);
const runtime = path.join(output, 'runtime-' + id);
fs.mkdirSync(path.join(runtime, 'uploads'), { recursive: true });
const checks = [],
  traces = [];
let child,
  exited,
  dropped = false;
const ok = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
const env = {};
for (const key of [
  'PATH',
  'Path',
  'SystemRoot',
  'WINDIR',
  'TEMP',
  'TMP',
  'LOCALAPPDATA',
  'APPDATA',
  'COMSPEC',
  'PATHEXT',
])
  if (process.env[key]) env[key] = process.env[key];
Object.assign(env, {
  DATABASE_URL: url.toString(),
  DIRECT_URL: url.toString(),
  JWT_SECRET: randomBytes(48).toString('hex'),
  NODE_ENV: 'test',
  NODE_PATH: path.join(root, 'dist'),
  RUN_PRISMA_MIGRATIONS: 'false',
  GUEST_EMAIL_ENABLED: 'false',
  GUEST_CHALLENGE_CLEANUP_ENABLED: 'false',
  PARCOURS_METRICS_ENABLED: 'false',
  LISTEN_HOST: '127.0.0.1',
  FRONTEND_URLS: 'http://127.0.0.1:5187,http://127.0.0.1:5174',
  DOTENV_CONFIG_PATH: path.join(runtime, 'absent.env'),
});
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) =>
    server.once('error', reject).listen(0, '127.0.0.1', resolve),
  );
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function stop() {
  if (!child || exited) return;
  child.kill('SIGTERM');
  let timeout;
  try {
    await Promise.race([
      new Promise((r) => child.once('exit', r)),
      new Promise((r) => {
        timeout = setTimeout(r, 10000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  if (!exited) {
    child.kill('SIGKILL');
    await new Promise((r) => child.once('exit', r));
  }
}
async function main() {
  const owner = new Client({ connectionString: source });
  await owner.connect();
  let created = false,
    db;
  try {
    await owner.query(`CREATE DATABASE "${database}"`);
    created = true;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    const config = path.join(runtime, 'prisma.config.ts'),
      sql = path.join(runtime, 'schema.sql');
    fs.writeFileSync(
      config,
      'export default ' +
        JSON.stringify({
          schema: path.join(root, 'prisma/schema.prisma'),
          datasource: { url: url.toString() },
        }) +
        ';\n',
    );
    const generated = spawnSync(
      process.execPath,
      [
        path.join(root, 'node_modules/prisma/build/index.js'),
        'migrate',
        'diff',
        '--from-empty',
        '--to-schema',
        path.join(root, 'prisma/schema.prisma'),
        '--script',
        '--output',
        sql,
        '--config',
        config,
      ],
      { cwd: runtime, env, encoding: 'utf8', timeout: 120000 },
    );
    assert.equal(
      generated.status,
      0,
      'Source datamodel generation must succeed.',
    );
    await db.query(fs.readFileSync(sql, 'utf8'));
    for (const c of readReleaseContract().structure.constraints.filter(
      (c) => c.type === 'c',
    )) {
      assert.match(c.table_name, /^[a-z_]+$/);
      assert.match(c.name, /^[a-z_]+$/);
      await db.query(
        `ALTER TABLE "${c.table_name}" ADD CONSTRAINT "${c.name}" ${c.definition}`,
      );
    }
    await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    assert.equal(
      (await db.query('SELECT current_database() AS name')).rows[0].name,
      database,
    );
    env.PORT = String(await freePort());
    const base = 'http://127.0.0.1:' + env.PORT;
    // Prevent any socket to a remote host even if a future module adds a provider.
    const guard = path.join(runtime, 'loopback-only.cjs');
    fs.writeFileSync(
      guard,
      `const net=require('node:net'); const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const options=Array.isArray(args[0])?args[0][0]:args[0];
const host=typeof options==='object'?options.host:(typeof args[1]==='string'?args[1]:'localhost');
if(host && !['127.0.0.1','localhost','::1'].includes(host)) throw Error('External socket forbidden by local runtime recipe');
return connect.apply(this,args);};\n`,
    );
    let logs = '';
    child = spawn(
      process.execPath,
      ['--require', guard, path.join(root, 'dist/src/main.js')],
      {
        cwd: runtime,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    child.on('exit', (code) => {
      exited = { code };
    });
    child.on('error', () => {
      exited = { code: 'spawn failed' };
    });
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (b) => {
        logs = (logs + b.toString()).slice(-150000);
      });
    async function request(method, route, body, headers = {}, rawBody) {
      const response = await fetch(base + '/api' + route, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': 'runtime-fixture-' + randomUUID(),
          ...headers,
        },
        ...(rawBody !== undefined
          ? { body: rawBody }
          : body === undefined
            ? {}
            : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10000),
      });
      const text = await response.text();
      traces.push({ method, path: route, status: response.status });
      return { response, text, data: text ? JSON.parse(text) : null };
    }
    let health;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (exited)
        throw Error(
          'Full bootstrap stopped before health; private logs omitted.',
        );
      try {
        health = await request('GET', '/health');
        if (health.response.status === 200) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.equal(
      health?.response.status,
      200,
      'Actual full bootstrap must become healthy.',
    );
    assert.equal(health.data.status, 'ok');
    assert.deepEqual(health.data.checks, {
      api: 'ok',
      database: 'ok',
      storage: 'ok',
    });
    assert.match(logs, /Backend NEWOTEG started/);
    assert.ok(!logs.includes('SMTP transporter configured'));
    const connections = await owner.query(
      'SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=$1',
      [database],
    );
    assert.ok(
      connections.rows[0].count >= 2,
      'Application must connect to the owned database.',
    );
    ok(
      'Actual main/AppModule, global middleware, storage and PostgreSQL start healthy without production env or provider keys',
    );

    const allowed = await request(
      'OPTIONS',
      '/commandes/guest/access',
      undefined,
      {
        Origin: 'http://127.0.0.1:5187',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-request-id',
      },
    );
    assert.equal(allowed.response.status, 204);
    assert.equal(
      allowed.response.headers.get('access-control-allow-origin'),
      'http://127.0.0.1:5187',
    );
    assert.equal(
      allowed.response.headers.get('access-control-allow-credentials'),
      'true',
    );
    const denied = await request(
      'GET',
      '/commandes/guest/channels',
      undefined,
      { Origin: 'https://untrusted.example.invalid' },
    );
    assert.equal(
      denied.response.headers.get('access-control-allow-origin'),
      null,
    );
    assert.deepEqual(denied.data, { email: false, sms: false });
    assert.equal(
      denied.response.headers.get('x-content-type-options'),
      'nosniff',
    );
    ok(
      'Configured local origin preflight works; unapproved origin gets no browser permission and message channels remain disabled',
    );

    const adminId = randomUUID(),
      username = 'runtime_' + id,
      password = randomBytes(32).toString('base64url');
    const hashed = await require('bcrypt').hash(password, 12);
    await db.query(
      'INSERT INTO admin_user (id,username,nom,role,mot_de_passe,is_active) VALUES ($1,$2,$3,$4,$5,true)',
      [adminId, username, 'Runtime fixture', 'ADMIN', hashed],
    );
    const login = await request('POST', '/admin-auth/login', {
      username,
      motDePasse: password,
    });
    assert.equal(login.response.status, 201);
    assert.ok(login.data.access_token);
    const auth = { Authorization: 'Bearer ' + login.data.access_token };
    assert.equal(
      (await request('GET', '/admin-auth/me', undefined, auth)).data.id,
      adminId,
    );
    assert.equal((await request('GET', '/admin-auth/me')).response.status, 401);
    assert.equal(
      (await request('GET', '/admin-auth/admins', undefined, auth)).response
        .status,
      403,
    );
    assert.equal(
      (await request('GET', '/caisse-jour/aujourdhui', undefined, auth))
        .response.status,
      200,
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM caisse')).rows[0]
        .count,
      0,
    );
    await db.query(
      'UPDATE admin_user SET session_version=session_version+1 WHERE id=$1',
      [adminId],
    );
    assert.equal(
      (await request('GET', '/admin-auth/me', undefined, auth)).response.status,
      401,
    );
    for (let i = 0; i < 4; i++)
      assert.equal(
        (
          await request('POST', '/admin-auth/login', {
            username: 'unknown-runtime-fixture',
            motDePasse: password,
          })
        ).response.status,
        401,
      );
    assert.equal(
      (
        await request('POST', '/admin-auth/login', {
          username: 'unknown-runtime-fixture',
          motDePasse: password,
        })
      ).response.status,
      429,
    );
    ok(
      'Full server authenticates a fixture, enforces roles and revoked sessions, reads shop cash without payment and limits login attempts',
    );

    function privateError(result, expected) {
      assert.equal(result.response.status, expected);
      assert.match(
        result.response.headers.get('cache-control') || '',
        /private.*no-store/,
      );
      assert.equal(
        result.response.headers.get('referrer-policy'),
        'no-referrer',
      );
      assert.match(
        result.response.headers.get('x-robots-tag') || '',
        /noindex/,
      );
      assert.equal(
        result.data.requestId,
        result.response.headers.get('x-request-id'),
      );
    }
    const invalid = await request('POST', '/commandes/guest/access', {
      accessToken: 'bad',
    });
    privateError(invalid, 400);
    ok(
      'Private guest DTO error retains no-store/no-referrer/noindex and request correlation before the controller runs',
    );
    for (let i = 1; i < 20; i++)
      privateError(
        await request('POST', '/commandes/guest/access', {
          accessToken: randomBytes(32).toString('base64url'),
        }),
        401,
      );
    const throttled = await request('POST', '/commandes/guest/access', {
      accessToken: randomBytes(32).toString('base64url'),
    });
    privateError(throttled, 429);
    assert.ok(Number(throttled.response.headers.get('retry-after')) > 0);
    ok(
      'Actual global ThrottlerGuard rejects the 21st private access attempt while preserving private error headers',
    );
    for (let i = 0; i < 5; i++) {
      const r = await request('POST', '/commandes/guest/recovery', {
        numeroSuivi: 'UNKNOWN-FIXTURE',
        email: 'fixture@example.invalid',
      });
      assert.equal(r.response.status, 200);
      assert.equal(r.data.available, false);
    }
    privateError(
      await request('POST', '/commandes/guest/recovery', {
        numeroSuivi: 'UNKNOWN-FIXTURE',
        email: 'fixture@example.invalid',
      }),
      429,
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int AS count FROM commande_guest_challenge',
        )
      ).rows[0].count,
      0,
    );
    ok(
      'Separate recovery route limit rejects the sixth attempt; unavailable transport never creates a challenge',
    );

    privateError(
      await request(
        'POST',
        '/avis/guest/purchases',
        undefined,
        {},
        '{invalid-json',
      ),
      400,
    );
    privateError(
      await request('POST', '/incompatibilites/guest/purchases', {
        accessToken: 'bad',
      }),
      400,
    );
    privateError(await request('GET', '/commandes/guest/unknown-fixture'), 404);
    const publicCatalogue = await request('GET', '/produits');
    assert.equal(publicCatalogue.response.status, 200);
    assert.equal(publicCatalogue.response.headers.get('x-robots-tag'), null);
    ok(
      'Parser, review/report DTO and unknown private route errors retain privacy; public catalogue is not marked private',
    );

    fs.renameSync(
      path.join(runtime, 'uploads'),
      path.join(runtime, 'uploads-unavailable'),
    );
    const degraded = await request('GET', '/health');
    assert.equal(degraded.response.status, 503);
    assert.equal(degraded.data.checks.storage, 'error');
    fs.renameSync(
      path.join(runtime, 'uploads-unavailable'),
      path.join(runtime, 'uploads'),
    );
    assert.equal((await request('GET', '/health')).response.status, 200);
    assert.ok(!logs.includes('External socket forbidden'));
    ok(
      'Actual health endpoint reports unavailable storage as 503 and becomes healthy after restoration',
    );
  } finally {
    await stop();
    await db?.end();
    try {
      if (created) {
        await owner.query(`DROP DATABASE "${database}"`);
        dropped = true;
      }
    } finally {
      await owner.end();
    }
  }
}
main()
  .then(() => {
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          status: 'passed',
          date: new Date().toISOString(),
          checks,
          traces,
          actualMain: true,
          fullAppModule: true,
          globalThrottler: true,
          realProvidersEnabled: false,
          sourceDatamodelNotMigrationHistory: true,
          databaseDropped: dropped,
          productionTouched: false,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(JSON.stringify({ passed: checks.length, output }));
  })
  .catch((error) => {
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          status: 'failed',
          checks,
          traces,
          error: error.message,
          databaseDropped: dropped,
        },
        null,
        2,
      ) + '\n',
    );
    console.error(error.message);
    process.exitCode = 1;
  });
