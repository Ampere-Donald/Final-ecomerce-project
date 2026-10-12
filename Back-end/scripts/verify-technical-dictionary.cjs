// Child recipe: synthetic data on the explicit owned provenance cluster only.
const assert = require('node:assert/strict'),
  path = require('node:path');
module.exports = async ({ db, root, request, tokens, ok, base, output }) => {
  const [owner] = await db.$queryRawUnsafe(
    'SELECT current_database() AS name,host(inet_server_addr()) AS host,inet_server_port() AS port',
  );
  assert.match(owner.name, /^newoteg_tech_[a-f0-9]{32}$/);
  assert.equal(owner.host, '127.0.0.1');
  assert.equal(owner.port, 55439);
  const { technicalDictionary } = require(
    path.join(root, 'dist/src/attribut/technical-dictionary'),
  );
  const dictionary = await request('GET', '/attributs/dictionnaire');
  assert.equal(dictionary.status, 200);
  assert.deepEqual(dictionary.data, technicalDictionary());
  const category = await db.categorie.create({
    data: { nom: 'Dictionary recipe only' },
  });
  const products = await Promise.all(
    ['Dictionnaire recette A', 'Dictionnaire recette B'].map((nomProduit) =>
      db.produit.create({
        data: {
          nomProduit,
          categorieId: category.id,
          prixDetail: 1000,
          quantiteStock: 2,
          cmupActuel: 555,
        },
      }),
    ),
  );
  for (const entry of dictionary.data.entries) {
    const created = await request(
      'POST',
      '/attributs',
      {
        produitId: products[0].id,
        nomAttribut: 'Dictionary fixture ' + entry.key,
        typeAttribut: 'TEXTE',
        cleTechnique: entry.key,
      },
      tokens.ADMIN,
    );
    assert.equal(created.status, 201);
    assert.equal(created.data.cleTechnique, entry.key);
  }
  assert.equal(
    (
      await request(
        'POST',
        '/attributs',
        {
          produitId: products[0].id,
          nomAttribut: 'Unknown dictionary fixture',
          typeAttribut: 'TEXTE',
          cleTechnique: 'TENSION',
        },
        tokens.ADMIN,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        'POST',
        '/attributs',
        {
          produitId: products[0].id,
          nomAttribut: 'Seller dictionary fixture',
          typeAttribut: 'TEXTE',
          cleTechnique: 'BOITIER',
        },
        tokens.VENDEUR,
      )
    ).status,
    403,
  );
  ok(
    'Public dictionary matches all stored keys; actual admin DTO accepts every key and rejects ambiguous key or seller write',
  );
  const attributes = [];
  for (const [index, label, key, value] of [
    [0, 'Boîtier recette', 'BOITIER', 'TO-92'],
    [1, 'Package recette', 'BOITIER', 'TO-92'],
    [0, 'Courant recette', 'ALIMENTATION_SORTIE_COURANT', '1 A'],
    [1, 'Output current recipe', 'ALIMENTATION_SORTIE_COURANT', '1000 mA'],
    [0, 'Tension', 'ALIMENTATION_ENTREE_PLAGE', '12 V'],
    [1, 'Tension', 'ALIMENTATION_SORTIE_TENSION', '12 V'],
  ]) {
    const attr = await db.attribut.create({
      data: {
        produitId: products[index].id,
        nomAttribut: label,
        typeAttribut: 'TEXTE',
        cleTechnique: key,
      },
    });
    const v = await db.valeurAttribut.create({
      data: { attributId: attr.id, valeur: value },
    });
    const endpoint = '/valeurs-attribut/' + v.id + '/documentation';
    const review = await request(
      'POST',
      endpoint + '/relire',
      {
        version: 0,
        valeurVersion: 1,
        attributVersion: 1,
        produitVersion: 1,
        etat: 'A_VERIFIER',
        sourceUrl: 'https://manufacturer.example/dictionary-fixture.pdf',
        sourceDocument: 'Synthetic dictionary test only',
        sourceRepere: 'Table 1',
        motif: 'Owned synthetic test only, not a shop technical approval',
        confirmerRelecture: true,
      },
      tokens.ADMIN,
    );
    assert.equal(review.status, 201);
    attributes.push({ attr, value: v, endpoint });
  }
  const first = attributes[0],
    reviewed = await db.documentationValeur.findUnique({
      where: { valeurId: first.value.id },
    });
  assert.equal(
    (
      await request(
        'PATCH',
        '/attributs/' + first.attr.id,
        { cleTechnique: 'DIMENSIONS' },
        tokens.ADMIN,
      )
    ).status,
    200,
  );
  assert.deepEqual((await request('GET', first.endpoint)).data, {
    etat: 'A_VERIFIER',
    obsolete: true,
  });
  assert.equal(
    (
      await db.documentationValeur.findUnique({
        where: { valeurId: first.value.id },
      })
    ).reluLe.toISOString(),
    reviewed.reluLe.toISOString(),
  );
  assert.equal(
    (
      await request(
        'PATCH',
        '/attributs/' + first.attr.id,
        { cleTechnique: null },
        tokens.ADMIN,
      )
    ).status,
    200,
  );
  assert.equal(
    (await db.attribut.findUnique({ where: { id: first.attr.id } }))
      .cleTechnique,
    null,
  );
  ok(
    'Changing/removing a semantic key invalidates the current review while preserving its original proof and source text',
  );
  if (process.argv.includes('--dictionary-browser')) {
    const { ProduitService } = require(
      path.join(root, 'dist/src/produit/produit.service'),
    );
    const { masquerCouts } = require(
      path.join(root, 'dist/src/produit/public-product'),
    );
    const service = new ProduitService(db, null, null, null);
    const publicProducts = [];
    for (const p of products)
      publicProducts.push(masquerCouts(await service.findOne(p.id)));
    const { fork } = require('node:child_process');
    await new Promise((resolve, reject) => {
      const child = fork(
        path.join(root, '../Font-end/tests/verify-technical-dictionary.cjs'),
        [],
        {
          env: {
            ...process.env,
            DICTIONARY_BROWSER_OUTPUT: path.join(output, 'dictionary-browser'),
          },
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
          windowsHide: true,
        },
      );
      const timeout = setTimeout(() => {
        child.kill();
        reject(Error('Owned dictionary browser deadline'));
      }, 240000);
      child.stdout.on('data', (chunk) => process.stdout.write(chunk));
      child.stderr.on('data', (chunk) => process.stderr.write(chunk));
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('exit', (code) => {
        clearTimeout(timeout);
        code === 0
          ? resolve()
          : reject(Error('Owned dictionary browser failed'));
      });
      child.send({
        base,
        token: tokens.ADMIN,
        attributeId: first.attr.id,
        valueId: first.value.id,
        endpoint: first.endpoint,
        products: publicProducts,
        categoryId: category.id,
      });
    });
    assert.equal(
      (await db.attribut.findUnique({ where: { id: first.attr.id } }))
        .cleTechnique,
      'BOITIER',
    );
    assert.equal(
      (
        await db.documentationValeur.findUnique({
          where: { valeurId: first.value.id },
        })
      ).reluLe.toISOString(),
      reviewed.reluLe.toISOString(),
    );
    ok(
      'Built admin selects the real server dictionary through HTTP/JWT/PostgreSQL; built comparator groups semantic keys and preserves per-product sources',
    );
  }
};
