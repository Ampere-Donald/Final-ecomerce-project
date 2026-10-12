// Synthetic fixtures only, on the owner-checked local provenance database.
const assert = require('node:assert/strict'),
  path = require('node:path'),
  { randomUUID } = require('node:crypto');
module.exports = async ({
  db,
  root,
  request,
  tokens,
  ok,
  base: serverBase,
  output,
}) => {
  const [owner] = await db.$queryRawUnsafe(
    'SELECT current_database() AS name,host(inet_server_addr()) AS host,inet_server_port() AS port',
  );
  assert.match(owner.name, /^newoteg_tech_[a-f0-9]{32}$/);
  assert.equal(owner.host, '127.0.0.1');
  assert.equal(owner.port, 55439);
  const nom = 'Composants Électroniques';
  const category = await db.categorie.upsert({
    where: { nom },
    create: { nom },
    update: {},
  });
  const products = [];
  for (const role of ['candidate', 'target', 'unrelated'])
    products.push(
      await db.produit.create({
        data: {
          nomProduit: 'Replacement fixture ' + role + ' ' + randomUUID(),
          categorieId: category.id,
          quantiteStock: 4,
          prixDetail: 1000,
          cmupActuel: 777,
        },
      }),
    );
  const values = [];
  for (const p of products) {
    const a = await db.attribut.create({
      data: {
        produitId: p.id,
        nomAttribut: 'Fixture package',
        cleTechnique: 'BOITIER',
        typeAttribut: 'TEXTE',
      },
    });
    values.push(
      await db.valeurAttribut.create({
        data: { attributId: a.id, valeur: 'Fixture only TO-92' },
      }),
    );
  }
  async function source(index, extra = {}) {
    const v = values[index];
    const old = await request(
      'GET',
      '/valeurs-attribut/' + v.id + '/documentation-admin',
      undefined,
      tokens.ADMIN,
    );
    const data = {
      version: old.data.documentation?.version || 0,
      valeurVersion: 1,
      attributVersion: 1,
      produitVersion: 1,
      etat: 'A_VERIFIER',
      sourceUrl: 'https://manufacturer.example/replacement-fixture.pdf',
      sourceDocument: 'Synthetic candidate reference',
      sourceRepere: 'Table 1',
      motif: 'Synthetic review only',
      confirmerRelecture: true,
      ...extra,
    };
    const response = await request(
      'POST',
      '/valeurs-attribut/' + v.id + '/documentation/relire',
      data,
      tokens.ADMIN,
    );
    assert.equal(response.status, 201);
    return response.data;
  }
  const route = '/equivalence/cas',
    candidatId = products[0].id;
  const evidenceRoute = route + '/pieces/' + candidatId + '/preuves';
  assert.equal((await request('GET', evidenceRoute)).status, 401);
  assert.equal(
    (await request('GET', evidenceRoute, undefined, tokens.VENDEUR)).status,
    403,
  );
  assert.equal(
    (
      await request(
        'GET',
        route + '/pieces/not-a-uuid/preuves',
        undefined,
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        'GET',
        evidenceRoute + '?after=not-a-uuid',
        undefined,
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        'GET',
        route + '/pieces/' + randomUUID() + '/preuves',
        undefined,
        tokens.ADMIN,
      )
    ).status,
    404,
  );
  const extraIds = Array.from({ length: 101 }, () => randomUUID());
  await db.valeurAttribut.createMany({
    data: extraIds.map((id, index) => ({
      id,
      attributId: values[0].attributId,
      valeur: 'Pagination fixture only ' + index,
    })),
  });
  const page1 = await request('GET', evidenceRoute, undefined, tokens.ADMIN);
  assert.equal(page1.cacheControl, 'private, no-store');
  assert.equal(page1.data.valeurs.length, 100);
  assert(page1.data.next);
  const page2 = await request(
    'GET',
    evidenceRoute + '?after=' + page1.data.next,
    undefined,
    tokens.ADMIN,
  );
  assert.equal(page2.data.valeurs.length, 2);
  assert.equal(page2.data.next, null);
  assert.equal(
    new Set([...page1.data.valeurs, ...page2.data.valeurs].map((v) => v.id))
      .size,
    102,
  );
  assert(
    [...page1.data.valeurs, ...page2.data.valeurs].every(
      (v) => v.attribut.produitId === candidatId,
    ),
  );
  assert(!JSON.stringify(page1.data).includes('cmupActuel'));
  assert(!JSON.stringify(page1.data).includes('reluParId'));
  await db.valeurAttribut.deleteMany({ where: { id: { in: extraIds } } });
  ok(
    'Private evidence picker checks roles and UUIDs, paginates one product without cost/reviewer leakage and never omits a trailing page',
  );
  const base = {
    version: 0,
    reference: 'BC547B',
    candidatId,
    application: 'Synthetic declared circuit 1 mA',
    verdict: 'DIRECT_DOCUMENTE',
    justification: 'Fixture matching only, not a real replacement',
    limites: 'Only the synthetic declared circuit',
    sourceUrl: 'https://manufacturer.example/original-fixture.pdf',
    sourceDocument: 'Fixture original exact marking',
    sourceRepere: 'Table 2',
    valeurIds: [values[0].id],
    retire: false,
  };
  const evaluate = (extra = {}) =>
    request('POST', route + '/evaluer', {
      query: base.reference,
      application: base.application,
      candidatIds: [candidatId],
      ...extra,
    });
  assert.equal((await request('GET', route)).status, 401);
  assert.equal(
    (await request('GET', route, undefined, tokens.VENDEUR)).status,
    403,
  );
  assert.equal((await request('POST', route, base)).status, 401);
  assert.equal(
    (await request('POST', route, base, tokens.VENDEUR)).status,
    403,
  );
  assert.equal(
    (
      await request(
        'POST',
        route,
        { ...base, adaptations: 'Move a pin' },
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        'POST',
        route,
        { ...base, sourceUrl: 'javascript:alert(1)' },
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        'POST',
        route,
        { ...base, valeurIds: [values[2].id] },
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  const created = await request(
    'POST',
    route,
    {
      ...base,
      reluParId: 'FORGED',
      reluLe: new Date().toISOString(),
      reluVersion: 1,
    },
    tokens.ADMIN,
  );
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal((await request('POST', route, base, tokens.ADMIN)).status, 409);
  assert.equal(created.data.reluParId, null);
  assert.equal(created.data.reluActuel, false);
  assert.equal((await evaluate()).cacheControl, 'no-store');
  assert.equal((await evaluate()).data[0].decision, null);
  assert.equal((await request('GET', route + '/' + id)).status, 401);
  assert.equal(
    (await request('GET', route + '/' + id, undefined, tokens.VENDEUR)).status,
    403,
  );
  let read = await request('GET', route + '/' + id, undefined, tokens.ADMIN);
  assert.equal(read.cacheControl, 'private, no-store');
  assert.equal(read.data.sourcesSelectionRelues, false);
  const reviewInput = () => ({
    version: read.data.version,
    empreinte: read.data.empreinteCourante,
    confirmerRelecture: true,
  });
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + id + '/relire',
        reviewInput(),
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: id } }),
    0,
  );
  ok(
    'Actual JWT/roles isolate replacement drafts/history; forged stamps, unrelated evidence and unreviewed values cannot publish a decision',
  );
  await source(0);
  if (process.argv.includes('--replacement-browser')) {
    await source(2);
    await new Promise((resolve, reject) => {
      const child = require('node:child_process').fork(
        path.join(__dirname, 'verify-replacement-cases-browser.cjs'),
        [],
        {
          env: {
            ...process.env,
            TECHNICAL_BROWSER_OUTPUT: path.join(output, 'admin-browser'),
          },
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        },
      );
      child.stdout.on('data', (chunk) => process.stdout.write(chunk));
      child.stderr.on('data', (chunk) => process.stderr.write(chunk));
      const timeout = setTimeout(() => {
        child.kill();
        reject(Error('Owned replacement browser timed out'));
      }, 180000);
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('exit', (code) => {
        clearTimeout(timeout);
        code === 0
          ? resolve()
          : reject(Error('Owned replacement browser failed'));
      });
      child.send({
        base: serverBase,
        token: tokens.ADMIN,
        piece: { id: products[2].id, nomProduit: products[2].nomProduit },
        value: values[2].id,
      });
    });
    ok(
      'Built replacement admin creates, edits and reviews through actual Nest JWT/DTO/PostgreSQL; real stale-source conflict preserves input; 390/768/1440 controls verified',
    );
  }
  read = await request('GET', route + '/' + id, undefined, tokens.ADMIN);
  assert.equal(read.data.sourcesSelectionRelues, true);
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + id + '/relire',
        { ...reviewInput(), confirmerRelecture: false },
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + id + '/relire',
        reviewInput(),
        tokens.VENDEUR,
      )
    ).status,
    403,
  );
  const concurrent = await Promise.all([
    request('POST', route + '/' + id + '/relire', reviewInput(), tokens.ADMIN),
    request(
      'PATCH',
      route + '/' + id,
      {
        ...base,
        version: read.data.version,
        justification: 'Concurrent fixture edit',
      },
      tokens.ADMIN,
    ),
  ]);
  assert.deepEqual(
    concurrent
      .map((r) => (r.status === 201 ? 200 : r.status))
      .sort((a, b) => a - b),
    [200, 409],
  );
  read = await request('GET', route + '/' + id, undefined, tokens.ADMIN);
  if (!read.data.reluActuel) {
    assert.equal(
      (
        await request(
          'POST',
          route + '/' + id + '/relire',
          reviewInput(),
          tokens.ADMIN,
        )
      ).status,
      201,
    );
    read = await request('GET', route + '/' + id, undefined, tokens.ADMIN);
  }
  assert.equal(read.data.reluActuel, true);
  assert.equal(read.data.historique.length, 1);
  let result = await evaluate();
  assert.equal(result.status, 201);
  assert.equal(result.data[0].decision.verdict, 'DIRECT_DOCUMENTE');
  assert.equal(result.data[0].decision.application, base.application);
  assert.equal(result.data[0].decision.source.repere, 'Table 2');
  for (const hidden of [
    'reluParId',
    'preuvesActuelles',
    'empreinteRelue',
    'cmupActuel',
    'historique',
    'FORGED',
  ])
    assert(!JSON.stringify(result.data).includes(hidden));
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + id + '/relire',
        reviewInput(),
        tokens.ADMIN,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await evaluate({
        query: ' BC547B ',
        application: ' Synthetic declared circuit  1 mA ',
      })
    ).data[0].decision.verdict,
    'DIRECT_DOCUMENTE',
  );
  for (const mismatch of [
    { query: 'BC547C' },
    { query: 'bc547b' },
    { query: 'BC-547B' },
    { application: 'Synthetic declared circuit 1 MA' },
    { application: '' },
    { application: 'Other circuit' },
  ])
    assert.equal((await evaluate(mismatch)).data[0].decision, null);
  ok(
    'Real concurrent review/edit has one winner; public human decision requires exact suffix/application/unit case and hides all private evidence',
  );
  const oldProof = JSON.stringify(read.data.historique[0]);
  const staleInput = reviewInput();
  await source(0, { conditions: 'Changed selected source condition' });
  assert.equal((await evaluate()).data[0].decision, null);
  read = await request('GET', route + '/' + id, undefined, tokens.ADMIN);
  assert.equal(read.data.obsolete, true);
  assert.equal(JSON.stringify(read.data.historique[0]), oldProof);
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + id + '/relire',
        staleInput,
        tokens.ADMIN,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + id + '/relire',
        reviewInput(),
        tokens.ADMIN,
      )
    ).status,
    201,
  );
  read = await request('GET', route + '/' + id, undefined, tokens.ADMIN);
  assert.equal(read.data.historique.length, 2);
  const firstHistory = read.data.historique.find(
    (h) => JSON.stringify(h) === oldProof,
  );
  assert(firstHistory);
  assert.equal(
    (
      await request(
        'PATCH',
        route + '/' + id,
        { ...base, version: read.data.version, retire: true },
        tokens.ADMIN,
      )
    ).status,
    200,
  );
  assert.equal((await evaluate()).data[0].decision, null);
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: id } }),
    2,
  );
  ok(
    'Source-only edit invalidates replacement without changing value/product; history is immutable and explicit withdrawal takes effect immediately',
  );
  for (const verdict of ['ADAPTATION_NECESSAIRE', 'REFUSE', 'A_CONFIRMER']) {
    const application = 'Fixture scope ' + verdict;
    const made = await request(
      'POST',
      route,
      {
        ...base,
        application,
        verdict,
        ...(verdict === 'ADAPTATION_NECESSAIRE'
          ? { adaptations: 'Fixture modification only' }
          : {}),
      },
      tokens.ADMIN,
    );
    assert.equal(made.status, 201);
    const readCase = await request(
      'GET',
      route + '/' + made.data.id,
      undefined,
      tokens.ADMIN,
    );
    assert.equal(
      (
        await request(
          'POST',
          route + '/' + made.data.id + '/relire',
          {
            version: readCase.data.version,
            empreinte: readCase.data.empreinteCourante,
            confirmerRelecture: true,
          },
          tokens.ADMIN,
        )
      ).status,
      201,
    );
    const visible = (await evaluate({ application })).data[0].decision;
    assert.equal(visible.verdict, verdict);
    if (verdict === 'ADAPTATION_NECESSAIRE')
      assert.equal(visible.adaptations, 'Fixture modification only');
  }
  const anchored = await request(
    'POST',
    route,
    {
      ...base,
      cibleId: products[1].id,
      valeurIds: [values[0].id, values[1].id],
      application: 'Fixture anchored target',
    },
    tokens.ADMIN,
  );
  assert.equal(anchored.status, 201);
  let anchor = await request(
    'GET',
    route + '/' + anchored.data.id,
    undefined,
    tokens.ADMIN,
  );
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + anchored.data.id + '/relire',
        {
          version: anchor.data.version,
          empreinte: anchor.data.empreinteCourante,
          confirmerRelecture: true,
        },
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  await source(1);
  anchor = await request(
    'GET',
    route + '/' + anchored.data.id,
    undefined,
    tokens.ADMIN,
  );
  assert.equal(
    (
      await request(
        'POST',
        route + '/' + anchored.data.id + '/relire',
        {
          version: anchor.data.version,
          empreinte: anchor.data.empreinteCourante,
          confirmerRelecture: true,
        },
        tokens.ADMIN,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await evaluate({
        produitId: products[1].id,
        application: 'Fixture anchored target',
      })
    ).data[0].decision.verdict,
    'DIRECT_DOCUMENTE',
  );
  assert.equal(
    (
      await evaluate({
        produitId: products[2].id,
        application: 'Fixture anchored target',
      })
    ).data[0].decision,
    null,
  );
  await db.produit.update({
    where: { id: products[1].id },
    data: { version: { increment: 1 }, marque: 'Changed target fixture' },
  });
  assert.equal(
    (
      await evaluate({
        produitId: products[1].id,
        application: 'Fixture anchored target',
      })
    ).data[0].decision,
    null,
  );
  ok(
    'All four human verdicts remain distinct; catalogue target requires its own reviewed values and later target changes invalidate the case',
  );
  assert.equal(
    (await evaluate({ candidatIds: Array(6).fill(candidatId) })).status,
    400,
  );
  assert.equal((await evaluate({ candidatIds: ['not-a-uuid'] })).status, 400);
  await db.produit.update({
    where: { id: candidatId },
    data: { quantiteStock: 0 },
  });
  assert.equal(
    (await evaluate({ application: 'Fixture scope ADAPTATION_NECESSAIRE' }))
      .data[0].decision,
    null,
  );
  await db.produit.update({
    where: { id: candidatId },
    data: { quantiteStock: 4, estActif: false },
  });
  assert.equal(
    (await evaluate({ application: 'Fixture scope REFUSE' })).data[0].decision,
    null,
  );
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: id } }),
    2,
  );
  ok(
    'Public evaluation is bounded and rechecks stock/archive status; no order, provider call, customer data or stock write is performed by the evaluator',
  );
  const { ProduitService } = require(
    path.join(root, 'dist/src/produit/produit.service'),
  );
  let sideEffects = 0;
  const service = new ProduitService(
    db,
    {
      create: () => {
        sideEffects++;
      },
    },
    {
      deleteByUrl: () => {
        sideEffects++;
      },
    },
    null,
  );
  await assert.rejects(
    service.remove(candidatId),
    (error) =>
      error.getStatus?.() === 409 && error.message.includes('Désactivez'),
  );
  assert.equal(sideEffects, 0);
  await db.produit.update({
    where: { id: candidatId },
    data: { estActif: true },
  });
  assert.equal(
    (await evaluate({ application: 'Fixture scope ADAPTATION_NECESSAIRE' }))
      .data[0].decision.verdict,
    'ADAPTATION_NECESSAIRE',
  );
  await db.valeurAttribut.delete({ where: { id: values[0].id } });
  assert.equal(
    (await evaluate({ application: 'Fixture scope ADAPTATION_NECESSAIRE' }))
      .data[0].decision,
    null,
  );
  assert.equal(
    await db.relectureRemplacement.count({ where: { casId: id } }),
    2,
  );
  ok(
    'Retained technical history prevents product deletion without media/event side effects; selected value deletion invalidates every dependent decision and preserves history',
  );
};
