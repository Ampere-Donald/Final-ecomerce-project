// Source-built modules, real PostgreSQL/HTTP/JWT and local browser applications.
// Fresh database owned by this exact run; no .env, real messages or external API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const sourceUrl = process.env.NEWOTEG_E2E_TEST_DATABASE_URL;
const target = sourceUrl ? new URL(sourceUrl) : null;
if (
  !target ||
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/postgres' ||
  target.username !== 'quote_test'
)
  throw Error('Explicit dedicated local quote_test cluster required.');
const runId = randomUUID().replaceAll('-', '');
const database = 'newoteg_e2e_' + runId;
assert.match(database, /^newoteg_e2e_[a-f0-9]{32}$/);
const localUrl = new URL(sourceUrl);
localUrl.pathname = '/' + database;
for (const key of Object.keys(process.env))
  if (
    /^(DATABASE_URL|DIRECT_URL|SMTP_|GEMINI_|GOOGLE_|CLOUDINARY_|JWT_SECRET)/.test(
      key,
    )
  )
    delete process.env[key];
Object.assign(process.env, {
  DATABASE_URL: localUrl.toString(),
  JWT_SECRET: randomBytes(48).toString('hex'),
  NODE_ENV: 'test',
  RUN_PRISMA_MIGRATIONS: 'false',
  GUEST_EMAIL_ENABLED: 'false',
  GUEST_CHALLENGE_CLEANUP_ENABLED: 'false',
  PARCOURS_METRICS_ENABLED: 'false',
});
process.env.NODE_PATH = path.resolve(__dirname, '../dist');
require('node:module').Module._initPaths();
const root = path.resolve(__dirname, '..');
const output = path.resolve(
  process.env.NEWOTEG_E2E_TEST_OUTPUT ||
    path.join(root, '.local-postgres/end-to-end', runId),
);
fs.mkdirSync(output, { recursive: true });
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { readReleaseContract } = require('./release-schema-contract.cjs');
const bcrypt = require('bcrypt');
const source = (name) => require('../dist/src/' + name);
const { MailService } = source('auth/mail.service');
const { CloudinaryService } = source('cloudinary/cloudinary.service');
const modules = [
  ['database/database.module', 'DatabaseModule'],
  ['notification/notification.module', 'NotificationModule'],
  ['cloudinary/cloudinary.module', 'CloudinaryModule'],
  ['admin-auth/admin-auth.module', 'AdminAuthModule'],
  ['auth/auth.module', 'AuthModule'],
  ['categorie/categorie.module', 'CategorieModule'],
  ['produit/produit.module', 'ProduitModule'],
  ['commande/commande.module', 'CommandeModule'],
  ['devis/devis.module', 'DevisModule'],
  ['projet/projet.module', 'ProjetModule'],
  ['avis/avis.module', 'AvisModule'],
  ['parcours/parcours.module', 'ParcoursModule'],
  ['incompatibilites/incompatibilites.module', 'IncompatibilitesModule'],
  ['favori/favori.module', 'FavoriModule'],
].map(([name, exported]) => source(name)[exported]);
const checks = [],
  outside = [];
let databaseDropped = false;
fs.writeFileSync(
  path.join(output, 'result.json'),
  JSON.stringify({ status: 'running', runId, checks }, null, 2) + '\n',
);
const ok = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
const mail = {
  enabled: false,
  messages: [],
  guestRecoveryAvailable() {
    return this.enabled;
  },
};
for (const method of [
  'sendGuestAccessCode',
  'sendGuestLinkCode',
  'sendGuestActionCode',
  'sendGuestReviewCode',
  'sendGuestIncompatibiliteCode',
])
  mail[method] = async (...args) => {
    if (!mail.enabled) return false;
    mail.messages.push({ method, args });
    return true;
  };
for (const method of ['sendOtp', 'sendResetCode', 'sendDailyReport'])
  mail[method] = async () => {
    throw Error('External messages forbidden in this recipe');
  };
const originalFetch = global.fetch;
global.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input.url || input);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    outside.push(url.hostname);
    throw Error('External request forbidden');
  }
  return originalFetch(input, options);
};
async function main() {
  const adminDb = new Client({ connectionString: sourceUrl });
  await adminDb.connect();
  let created = false,
    schemaDb,
    db,
    app;
  try {
    await adminDb.query(`CREATE DATABASE "${database}"`);
    created = true;
    schemaDb = new Client({ connectionString: localUrl.toString() });
    await schemaDb.connect();
    const config = path.join(output, 'prisma.config.ts'),
      sql = path.join(output, 'schema.sql');
    fs.writeFileSync(
      config,
      'export default ' +
        JSON.stringify({
          schema: path.join(root, 'prisma/schema.prisma'),
          datasource: { url: localUrl.toString() },
        }) +
        ';\n',
    );
    const result = spawnSync(
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
      { cwd: root, encoding: 'utf8', timeout: 120000 },
    );
    assert.equal(result.status, 0, 'Source schema generation failed');
    await schemaDb.query(fs.readFileSync(sql, 'utf8'));
    for (const constraint of readReleaseContract().structure.constraints.filter(
      (c) => c.type === 'c',
    )) {
      assert.match(constraint.table_name, /^[a-z_]+$/);
      assert.match(constraint.name, /^[a-z_]+$/);
      await schemaDb.query(
        `ALTER TABLE "${constraint.table_name}" ADD CONSTRAINT "${constraint.name}" ${constraint.definition}`,
      );
    }
    await schemaDb.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await schemaDb.end();
    schemaDb = null;
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: localUrl.toString() }),
      transactionOptions: { maxWait: 10000, timeout: 20000 },
    });
    const password = 'Fixture-' + randomBytes(20).toString('hex');
    const hashed = await bcrypt.hash(password, 12);
    const client = await db.client.create({
      data: {
        nom: 'Client recette complète',
        email: `e2e-${runId}@example.invalid`,
        telephone: '+237600000001',
        motDePasse: hashed,
        emailVerifie: true,
      },
    });
    const admin = await db.adminUser.create({
      data: {
        nom: 'Équipe recette complète',
        username: 'e2e_' + runId,
        role: 'ADMIN',
        motDePasse: hashed,
        isActive: true,
        mustChangeCredential: false,
      },
    });
    const category = await db.categorie.create({
      data: { nom: 'Composants Électroniques' },
    });
    const products = [];
    for (const [suffix, price] of [
      ['N', 1200],
      ['P', 1500],
    ])
      products.push(
        await db.produit.create({
          data: {
            categorieId: category.id,
            nomProduit: `Composant de recette LM358-${suffix}`,
            designationEn: `Test component LM358-${suffix}`,
            code: `LM358-${suffix}`,
            codeFamille: 'AMPLI',
            marque: 'Recette fictive',
            description:
              'Fixture uniquement, aucune compatibilité électronique réelle validée.',
            prixDetail: price,
            quantiteStock: 20,
            attributs: {
              create: {
                nomAttribut: 'Tension',
                typeAttribut: 'TEXTE',
                valeurs: {
                  create: { valeur: suffix === 'N' ? '5 V' : '3.3 V' },
                },
              },
            },
          },
        }),
      );
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ...modules,
      ],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .overrideProvider(CloudinaryService)
      .useValue({
        uploadImage() {
          throw Error('Upload provider forbidden');
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.enableCors({ origin: true, credentials: true });
    await app.listen(0, '127.0.0.1');
    const { DatabaseService } = source('database/database.service');
    const actualDatabase = await app
      .get(DatabaseService)
      .$queryRawUnsafe('SELECT current_database() AS name');
    assert.equal(
      actualDatabase[0].name,
      database,
      'Every real service must use this exact owned database',
    );
    const base = await app.getUrl();
    async function api(method, route, body, token) {
      const response = await fetch(base + '/api' + route, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(
          `${method} ${route}: ${response.status} ${JSON.stringify(data)}`,
        );
      return data;
    }
    const adminLogin = await api('POST', '/admin-auth/login', {
      username: admin.username,
      motDePasse: password,
    });
    const adminToken = adminLogin.access_token;
    assert.ok(adminToken, 'Real admin login must return a token');
    await require('./verify-end-to-end-cash-day.cjs')({
      app,
      db,
      api,
      adminToken,
      admin,
      ok,
    });
    const draftResult = await api(
      'POST',
      '/projets/admin',
      {
        requestId: randomUUID(),
        slug: 'recette-complete',
        titre: 'Projet de recette fictif',
        titreEn: 'Fictitious acceptance project',
        resume: 'Fixture isolée, aucun montage réel validé.',
        resumeEn: 'Isolated fixture, no real circuit verified.',
        objectif: 'Tester les enchaînements fonctionnels.',
        prerequis: 'Recette locale uniquement.',
        contraintes: 'Ne pas construire ce montage fictif.',
        niveau: 'DEBUTANT',
        ordre: 0,
        documents: [
          {
            titre: 'Documentation de recette',
            url: 'https://example.invalid/fiction.pdf',
          },
        ],
        lignes: products.map((p, i) => ({
          produitId: p.id,
          referenceSouhaitee: p.code,
          role: 'Fixture ' + i,
          quantite: i + 1,
          necessaire: true,
        })),
      },
      adminToken,
    );
    const draft = draftResult.projet;
    const publication = await api(
      'POST',
      `/projets/admin/${draft.id}/publication`,
      {
        requestId: randomUUID(),
        version: draft.version,
        referencesVerifiees: true,
        materielEtQuantitesVerifies: true,
        contraintesEtDocumentsVerifies: true,
        noteValidation:
          'Validation de fixtures fictives uniquement, pas de compatibilité électronique.',
        verifications: draft.lignes.map((l) => ({
          ligneId: l.id,
          empreinteTechnique: l.empreinteActuelle,
        })),
      },
      adminToken,
    );
    const project = publication.projet;
    ok(
      'Real modules, authentication and project publication run on a fresh isolated database',
    );
    await require('./verify-end-to-end-browser.cjs')({
      db,
      base,
      api,
      adminToken,
      adminLogin,
      client,
      admin,
      password,
      products,
      project,
      mail,
      ok,
      output,
      outside,
    });
    await require('./verify-end-to-end-devis-browser.cjs')({
      db,
      base,
      client,
      admin,
      password,
      products,
      ok,
      output,
    });
    await require('./verify-end-to-end-equivalences-browser.cjs')({
      db,
      base,
      api,
      admin,
      products,
      ok,
      output,
    });
    assert.deepEqual(outside, []);
    const report = {
      status: 'passed',
      date: new Date().toISOString(),
      checks,
      database:
        'Fresh disposable PostgreSQL; source datamodel, not migration history',
      externalRequests: outside,
      realApiRoutes: true,
      realAuthentication: true,
      mailTransport: 'captured fixture only; initially disabled',
      schedulersEnabled: false,
      globalThrottlerCoverage: false,
      physicalDevice: false,
      productionTouched: false,
      cleanup: 'pending',
    };
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    return report;
  } finally {
    const closes = await Promise.allSettled([
      app?.close(),
      db?.$disconnect(),
      schemaDb?.end(),
    ]);
    try {
      if (created) {
        await adminDb.query(`DROP DATABASE "${database}"`);
        databaseDropped = true;
      }
      const failedClose = closes.find((result) => result.status === 'rejected');
      if (failedClose) throw failedClose.reason;
    } finally {
      await adminDb.end();
      global.fetch = originalFetch;
    }
  }
}
main()
  .then((report) => {
    report.cleanup =
      'Exact database created by this run dropped after closing connections';
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        passed: checks.length,
        report: path.join(output, 'result.json'),
      }),
    );
  })
  .catch((error) => {
    const message = error.constructor?.name.startsWith('Prisma')
      ? 'Prisma operation failed; fixture inputs omitted.'
      : error.message;
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(
        { status: 'failed', runId, checks, error: message, databaseDropped },
        null,
        2,
      ) + '\n',
    );
    console.error(message);
    process.exitCode = 1;
  });
