// Actual local HTTP/SQL on the owner-checked synthetic provenance database.
const assert = require('node:assert/strict'),
  path = require('node:path'),
  { randomUUID } = require('node:crypto');
module.exports = async ({ db, root, request, tokens, ok, base, output }) => {
  const [owner] = await db.$queryRawUnsafe(
    'SELECT current_database() AS name,host(inet_server_addr()) AS host,inet_server_port() AS port',
  );
  assert.match(owner.name, /^newoteg_tech_[a-f0-9]{32}$/);
  assert.equal(owner.host, '127.0.0.1');
  assert.equal(owner.port, 55439);
  const category = await db.categorie.findUnique({
    where: { nom: 'Composants Électroniques' },
  });
  assert(category);
  const products = [],
    values = [];
  for (const role of ['candidate', 'target']) {
    const p = await db.produit.create({
      data: {
        categorieId: category.id,
        nomProduit: 'Dossier fixture ' + role + ' ' + randomUUID(),
        quantiteStock: 3,
        prixDetail: 1000,
        cmupActuel: 888,
      },
    });
    products.push(p);
    const a = await db.attribut.create({
      data: {
        produitId: p.id,
        nomAttribut: 'Boîtier fictif',
        cleTechnique: 'BOITIER',
        typeAttribut: 'TEXTE',
      },
    });
    values.push(
      await db.valeurAttribut.create({
        data: { attributId: a.id, valeur: 'Fixture TO-92' },
      }),
    );
  }
  async function source(index, conditions) {
    const old = (
      await request(
        'GET',
        '/valeurs-attribut/' + values[index].id + '/documentation-admin',
        undefined,
        tokens.ADMIN,
      )
    ).data;
    const r = await request(
      'POST',
      '/valeurs-attribut/' + values[index].id + '/documentation/relire',
      {
        version: old.documentation?.version ?? 0,
        valeurVersion: old.valeurVersion,
        attributVersion: old.attributVersion,
        produitVersion: old.produitVersion,
        etat: 'A_VERIFIER',
        sourceUrl: 'https://manufacturer.example/discovery-fixture.pdf',
        sourceDocument: 'Synthetic discovery source',
        sourceRepere: 'Table 1',
        conditions,
        motif: 'Synthetic review only',
        confirmerRelecture: true,
      },
      tokens.ADMIN,
    );
    assert.equal(r.status, 201);
  }
  await source(0, 'Synthetic condition');
  await source(1, 'Synthetic condition');
  const original = 'External marking QZ-TEST-B',
    route = '/equivalence/cas';
  const input = {
    version: 0,
    reference: original,
    candidatId: products[0].id,
    application: 'Synthetic use 0',
    verdict: 'DIRECT_DOCUMENTE',
    justification: 'Synthetic decision, no real replacement approval',
    limites: 'Synthetic circuit only',
    sourceUrl: 'https://manufacturer.example/original-discovery.pdf',
    sourceDocument: 'Synthetic original marking',
    sourceRepere: 'Table 2',
    valeurIds: [values[0].id],
    retire: false,
  };
  async function create(changes = {}, review = true) {
    const created = await request(
      'POST',
      route,
      { ...input, ...changes },
      tokens.ADMIN,
    );
    assert.equal(created.status, 201);
    if (review) await reread(created.data.id);
    return created.data.id;
  }
  async function reread(id) {
    const current = (
      await request('GET', route + '/' + id, undefined, tokens.ADMIN)
    ).data;
    const r = await request(
      'POST',
      route + '/' + id + '/relire',
      {
        version: current.version,
        empreinte: current.empreinteCourante,
        confirmerRelecture: true,
      },
      tokens.ADMIN,
    );
    assert.equal(r.status, 201);
  }
  const find = (changes = {}) =>
    request('POST', route + '/rechercher', { query: original, ...changes });
  for (const bad of [
    { query: '' },
    { query: 'x'.repeat(256) },
    { application: {} },
    { page: -1 },
    { page: '1' },
    { page: 1001 },
    { produitId: 'bad' },
  ])
    assert.equal((await find(bad)).status, 400);
  const draftId = await create({ application: 'Draft only' }, false);
  assert.equal((await find()).cacheControl, 'no-store');
  assert.equal((await find()).data.dossiers.length, 0);
  const ids = [];
  for (let i = 0; i < 7; i++) {
    const verdict = [
      'DIRECT_DOCUMENTE',
      'ADAPTATION_NECESSAIRE',
      'REFUSE',
      'A_CONFIRMER',
    ][i % 4];
    ids.push(
      await create({
        application: 'Synthetic use ' + i,
        verdict,
        ...(verdict === 'ADAPTATION_NECESSAIRE'
          ? { adaptations: 'Synthetic pinout adaptation' }
          : {}),
      }),
    );
  }
  assert.equal(
    (
      await request('POST', '/equivalence/suggest', {
        query: original,
        source: 'ecommerce',
      })
    ).data.suggestions.length,
    0,
  );
  let result = await find({ application: 'Synthetic use 6' });
  assert.equal(result.data.dossiers[0].decision.application, 'Synthetic use 6');
  assert.equal(result.data.dossiers[0].correspondAuMontage, true);
  assert(result.data.dossiers.slice(1).every((d) => !d.correspondAuMontage));
  for (const privateField of [
    'reluParId',
    'valeurIds',
    'empreinte',
    'cleCas',
    'historique',
    'cmupActuel',
  ])
    assert(
      !JSON.stringify(result.data).includes(privateField),
      'Public field leaked: ' + privateField,
    );
  assert(
    result.data.dossiers.every(
      (d) =>
        d.produit.id === products[0].id &&
        d.produit.prixPublic === 1000 &&
        d.produit.attributs[0].valeurs[0].documentation.etat === 'DOCUMENTE',
    ),
  );
  assert.equal(
    (await find({ query: original + '-C' })).data.dossiers.length,
    0,
  );
  assert.equal(
    (await find({ query: original.toLowerCase() })).data.dossiers.length,
    0,
  );
  const all = [];
  let page = 0;
  do {
    result = await find({ page });
    assert.equal(result.status, 201);
    assert(result.data.dossiers.length <= 5);
    assert(result.data.dossiers.every((d) => !d.correspondAuMontage));
    all.push(...result.data.dossiers);
    page = result.data.nextPage;
  } while (page !== null);
  assert.equal(all.length, 7);
  assert.equal(new Set(all.map((d) => d.decision.application)).size, 7);
  assert.equal(new Set(all.map((d) => d.decision.verdict)).size, 4);
  assert(!all.some((d) => d.decision.application === 'Draft only'));
  ok(
    'Public discovery finds reviewed stocked pieces omitted by the real lexical shortlist, pages all scopes and distinguishes exact/missing/different use without leaking drafts/history/costs',
  );
  await source(0, 'Changed source without changing the value');
  const invalidated = await find();
  assert.equal(invalidated.data.dossiers.length, 0);
  assert.equal(invalidated.data.nextPage, 1);
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: { in: ids } } }),
    7,
  );
  await reread(ids[0]);
  assert.equal(
    (await find({ application: 'Synthetic use 0' })).data.dossiers.length,
    1,
  );
  const current = (
    await request('GET', route + '/' + ids[0], undefined, tokens.ADMIN)
  ).data;
  assert.equal(
    (
      await request(
        'PATCH',
        route + '/' + ids[0],
        { ...current, retire: true },
        tokens.ADMIN,
      )
    ).status,
    200,
  );
  assert.equal((await find()).data.dossiers.length, 0);
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: ids[0] } }),
    2,
  );
  ok(
    'Fresh source-only changes and retirement remove discovery immediately without cached verdict reuse; invalidated pages retain continuation and immutable history',
  );
  const targetCase = await create({
    reference: 'Target marking',
    cibleId: products[1].id,
    valeurIds: values.map((v) => v.id),
    application: 'Target synthetic use',
  });
  assert.equal(
    (
      await find({
        produitId: products[1].id,
        application: 'Target synthetic use',
      })
    ).data.dossiers.length,
    1,
  );
  assert.equal(
    (await find({ produitId: products[0].id })).data.dossiers.length,
    0,
  );
  assert.equal(
    (await find({ query: 'Target marking' })).data.dossiers.length,
    0,
  );
  await db.produit.update({
    where: { id: products[0].id },
    data: { quantiteStock: 0 },
  });
  assert.equal(
    (await find({ produitId: products[1].id })).data.dossiers.length,
    0,
  );
  await db.produit.update({
    where: { id: products[0].id },
    data: { quantiteStock: 3, estActif: false },
  });
  assert.equal(
    (await find({ produitId: products[1].id })).data.dossiers.length,
    0,
  );
  await db.produit.update({
    where: { id: products[0].id },
    data: { estActif: true },
  });
  await db.produit.update({
    where: { id: products[1].id },
    data: { version: { increment: 1 }, nomProduit: 'Modified target fixture' },
  });
  assert.equal(
    (await find({ produitId: products[1].id })).data.dossiers.length,
    0,
  );
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: targetCase } }),
    1,
  );
  assert.equal((await find({ page: 1000 })).data.nextPage, null);
  ok(
    'Discovery DTO bounds pages/reference/use; archived, unavailable and modified targets cannot bypass current catalogue/source checks',
  );
  const browserRef = 'External UI marking QZ-TEST-B';
  const browserCase = await create({
    reference: browserRef,
    application: 'Circuit fictif 1 mA',
  });
  if (process.argv.includes('--replacement-client-browser')) {
    await new Promise((resolve, reject) => {
      const child = require('node:child_process').fork(
        path.join(root, '../Font-end/tests/verify-replacement-dossiers.cjs'),
        [],
        {
          env: {
            ...process.env,
            REPLACEMENT_BROWSER_OUTPUT: path.join(output, 'client-browser'),
          },
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
          windowsHide: true,
        },
      );
      child.stdout.on('data', (c) => process.stdout.write(c));
      child.stderr.on('data', (c) => process.stderr.write(c));
      const timeout = setTimeout(() => {
        child.kill();
        reject(Error('Owned client replacement browser deadline'));
      }, 240000);
      child.on('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });
      child.on('exit', (code) => {
        clearTimeout(timeout);
        code === 0
          ? resolve()
          : reject(Error('Owned client replacement browser failed'));
      });
      child.send({
        base,
        token: tokens.ADMIN,
        reference: browserRef,
        caseId: browserCase,
        valueId: values[0].id,
      });
    });
    ok(
      'Built client discovers reviewed pairs and four scoped verdicts through actual local HTTP/SQL; source invalidation, partial failures, retry and FR/EN mobile/tablet/desktop verified',
    );
  }
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: draftId } }),
    0,
  );
};
