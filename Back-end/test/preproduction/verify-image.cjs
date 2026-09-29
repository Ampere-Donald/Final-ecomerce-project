// Run inside the built image with /proof mounted to a private local directory.
// This harness deliberately cannot connect to Railway or exercise AI providers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const requireApp = require('node:module').createRequire('/app/package.json');
const { Client } = requireApp('pg');
const connectionString =
  'postgresql://refonte_test@127.0.0.1:55441/newoteg_image_test';
assert.equal(process.env.DATABASE_URL, connectionString);
const mode = process.argv[2];
assert.ok(['prepare', 'verify', 'replay'].includes(mode));
const reportFile = '/proof/verification-image.json';
const checkpointFile = '/proof/checkpoint.json';
async function api(method, route, body, token) {
  const res = await fetch('http://127.0.0.1:3017/api' + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: await res.json() };
}
async function main() {
  const db = new Client({ connectionString });
  await db.connect();
  try {
    assert.equal(
      (await db.query('SHOW server_version_num')).rows[0].server_version_num,
      '180006',
    );
    if (mode === 'prepare') {
      const audit = JSON.parse(fs.readFileSync('/proof/audit.json'));
      assert.equal(audit.readOnly, true);
      assert.equal(
        (await db.query('SELECT count(*)::int AS n FROM _prisma_migrations'))
          .rows[0].n,
        0,
      );
      assert.equal(
        (await db.query('SELECT count(*)::int AS n FROM client')).rows[0].n,
        0,
      );
      for (const [i, m] of audit.migrations.entries()) {
        await db.query(
          'INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,rolled_back_at,started_at,applied_steps_count) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [
            randomUUID(),
            m.checksum,
            m.finished_at,
            m.migration_name,
            m.rolled_back_at,
            new Date(946684800000 + i * 1000),
            m.applied_steps_count,
          ],
        );
      }
      await db.query(
        "INSERT INTO categorie(id,nom) VALUES ('image-category','TEST image'); INSERT INTO produit(id,id_categorie,nom_produit,quantite_stock,prix_detail) VALUES ('4cad378b-9663-47a2-b226-94dfe5a3a001','image-category','TEST image active',20,100); INSERT INTO produit(id,id_categorie,nom_produit,quantite_stock,prix_detail,est_actif) VALUES ('4cad378b-9663-47a2-b226-94dfe5a3a002','image-category','TEST image archive',20,100,false)",
      );
      fs.writeFileSync(
        '/proof/history-before.json',
        JSON.stringify(
          (
            await db.query(
              'SELECT * FROM _prisma_migrations ORDER BY started_at',
            )
          ).rows,
        ),
      );
      console.log('Local schema history and synthetic fixtures prepared.');
      return;
    }
    if (mode === 'replay') {
      const saved = JSON.parse(fs.readFileSync(checkpointFile));
      const replay = await api('POST', '/commandes/checkout', saved.body);
      assert.equal(replay.status, 201, JSON.stringify(replay));
      assert.equal(replay.body.commande.id, saved.orderId);
      assert.equal(
        (
          await db.query(
            "SELECT quantite_stock FROM produit WHERE id='4cad378b-9663-47a2-b226-94dfe5a3a001'",
          )
        ).rows[0].quantite_stock,
        saved.stock,
      );
      assert.equal(
        (await db.query('SELECT count(*)::int AS n FROM commande')).rows[0].n,
        saved.orders,
      );
      const report = JSON.parse(fs.readFileSync(reportFile));
      report.checks.push(
        'Reprise après redémarrage du conteneur : même commande, même stock et aucun doublon',
      );
      report.success = true;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
      console.log(`${report.checks.length} image checks passed.`);
      return;
    }
    const checks = [];
    assert.equal(process.getuid(), 1000);
    assert.ok(!fs.existsSync('/app/.env'));
    assert.ok(!fs.existsSync('/app/node_modules/@nestjs/cli'));
    fs.accessSync('/app/uploads', fs.constants.W_OK);
    checks.push(
      'Image exécutée sans root, sans fichier .env ni compilateur Nest, uploads accessibles en écriture',
    );
    const before = JSON.parse(fs.readFileSync('/proof/history-before.json'));
    const after = JSON.parse(
      JSON.stringify(
        (await db.query('SELECT * FROM _prisma_migrations ORDER BY started_at'))
          .rows,
      ),
    );
    assert.deepEqual(after.slice(0, before.length), before);
    assert.equal(after.length, before.length + 1);
    assert.equal(
      after.at(-1).migration_name,
      '20260924100000_order_request_idempotency',
    );
    checks.push(
      'Démarrage réel : seule la migration de reprise appliquée, historique antérieur conservé',
    );
    assert.equal((await api('GET', '/health')).status, 200);
    checks.push(
      'Santé HTTP du backend complet : base et uploads opérationnels',
    );
    const catalogue = await api('GET', '/produits?limit=12');
    assert.equal(catalogue.status, 200);
    assert.ok(
      JSON.stringify(catalogue.body).includes(
        '4cad378b-9663-47a2-b226-94dfe5a3a001',
      ),
    );
    assert.ok(
      !JSON.stringify(catalogue.body).includes(
        '4cad378b-9663-47a2-b226-94dfe5a3a002',
      ),
    );
    checks.push(
      'Catalogue public : produit actif visible, produit archivé masqué',
    );
    const quote = await api('POST', '/commandes/quote', {
      lignes: [
        { produitId: '4cad378b-9663-47a2-b226-94dfe5a3a001', quantite: 2 },
      ],
    });
    assert.equal(quote.status, 201);
    assert.equal(quote.body.montantArticles, 200);
    checks.push('Devis calculé avec le prix et le stock de PostgreSQL');
    const body = {
      requestId: randomUUID(),
      nomClient: 'Client image isolée',
      telephone: String(Date.now()),
      adresseLivraison: 'Retrait test',
      montantTotal: 100,
      modeReception: 'RETRAIT_MAGASIN',
      email: `${randomUUID()}@example.invalid`,
      motDePasse: 'TestOnly2026!',
      lignes: [
        {
          produitId: '4cad378b-9663-47a2-b226-94dfe5a3a001',
          nomProduit: 'TEST image active',
          quantite: 1,
          prixUnitaire: 100,
        },
      ],
    };
    const responses = await Promise.all([
      api('POST', '/commandes/checkout', body),
      api('POST', '/commandes/checkout', body),
    ]);
    responses.forEach((r) => assert.equal(r.status, 201, JSON.stringify(r)));
    const first = responses[0].body;
    assert.equal(first.commande.id, responses[1].body.commande.id);
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM commande')).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM mouvement_stock')).rows[0]
        .n,
      1,
    );
    assert.equal(
      (
        await db.query(
          "SELECT quantite_stock FROM produit WHERE id='4cad378b-9663-47a2-b226-94dfe5a3a001'",
        )
      ).rows[0].quantite_stock,
      19,
    );
    checks.push(
      'Deux checkout concurrents : un compte, une commande et un seul débit de stock',
    );
    assert.equal(
      (await api('GET', '/auth/me', undefined, first.access_token)).body.id,
      first.user.id,
    );
    const login = await api('POST', '/auth/login', {
      identifiant: body.email,
      motDePasse: body.motDePasse,
    });
    assert.equal(login.status, 201);
    assert.ok(login.body.access_token);
    checks.push(
      'Authentification complète : bcrypt Linux, connexion et session JWT valides',
    );
    const orders = await api(
      'GET',
      '/commandes/my-orders',
      undefined,
      first.access_token,
    );
    assert.equal(orders.status, 200);
    assert.ok(orders.body.some((o) => o.id === first.commande.id));
    checks.push('Commande accessible dans l’historique de son propriétaire');
    const conflict = await api('POST', '/commandes/checkout', {
      ...body,
      montantTotal: 999,
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, 'REQUEST_CONFLICT');
    checks.push('Tentative réutilisée avec un autre contenu refusée');
    const standard = {
      ...body,
      requestId: randomUUID(),
      email: undefined,
      motDePasse: undefined,
      montantTotal: 1,
    };
    const stale = await api('POST', '/commandes', standard, first.access_token);
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'PRICE_CHANGED');
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM commande')).rows[0].n,
      1,
    );
    checks.push('Prix falsifié refusé sans commande supplémentaire');
    fs.writeFileSync(
      checkpointFile,
      JSON.stringify({
        body,
        orderId: first.commande.id,
        stock: 19,
        orders: 1,
      }),
    );
    fs.writeFileSync(
      reportFile,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          node: process.version,
          postgres: '18.6',
          platform: process.platform,
          architecture: process.arch,
          productionTouched: false,
          remoteAI: false,
          emailConfigured: false,
          scope:
            'Built Linux image, restored schema-only archive, synthetic fixtures',
          success: false,
          checks,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      `${checks.length} checks passed; container restart/replay remains.`,
    );
  } finally {
    await db.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
