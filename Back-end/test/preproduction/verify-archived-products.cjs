// Isolated sandbox writes only; never connects to the public backend.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { configure, database, root } = require('../sandbox/config.cjs');
configure();
async function main() {
  const base = 'http://127.0.0.1:3016';
  assert.equal(
    (await (await fetch(base + '/sandbox-health')).json()).database,
    'newoteg_refonte_e_test',
  );
  const db = database();
  const checks = [];
  const api = async (route, body) => {
    const response = await fetch(base + '/api' + route, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const run = randomUUID();
    const category = await db.categorie.create({
      data: { nom: 'TEST archive ' + run },
    });
    const active = await db.produit.create({
      data: {
        nomProduit: 'TEST active ' + run,
        categorieId: category.id,
        quantiteStock: 3,
        prixDetail: 100,
      },
    });
    const inactive = await db.produit.create({
      data: {
        nomProduit: 'TEST inactive ' + run,
        categorieId: category.id,
        quantiteStock: 3,
        prixDetail: 100,
        estActif: false,
      },
    });
    const list = await api('/produits?search=' + run + '&includeInactive=true');
    assert.equal(list.status, 200);
    assert.ok(list.body.data.some((p) => p.id === active.id));
    assert.ok(!list.body.data.some((p) => p.id === inactive.id));
    checks.push(
      'Public catalogue ignores includeInactive without admin session',
    );
    assert.equal((await api('/produits/' + inactive.id)).status, 404);
    checks.push('Archived product page unavailable publicly');
    const cat = await api('/categories/' + category.id);
    assert.deepEqual(
      cat.body.produits.map((p) => p.id),
      [active.id],
    );
    const cats = await api('/categories');
    assert.equal(
      cats.body.find((c) => c.id === category.id)._count.produits,
      1,
    );
    checks.push('Category details and counts contain active products only');
    const quote = await api('/commandes/quote', {
      lignes: [{ produitId: active.id, quantite: 1 }],
    });
    assert.equal(quote.status, 201);
    await db.produit.update({
      where: { id: active.id },
      data: { estActif: false },
    });
    const before = await db.commande.count();
    const order = await api('/commandes/checkout', {
      requestId: randomUUID(),
      nomClient: 'Archive test',
      telephone: String(Date.now()),
      email: run + '@example.invalid',
      motDePasse: 'TestOnly2026!',
      adresseLivraison: 'Retrait test',
      modeReception: 'RETRAIT_MAGASIN',
      montantTotal: 100,
      lignes: [
        {
          produitId: active.id,
          nomProduit: active.nomProduit,
          quantite: 1,
          prixUnitaire: 100,
        },
      ],
    });
    assert.equal(order.status, 404);
    assert.equal(await db.commande.count(), before);
    assert.equal(
      await db.client.count({ where: { email: run + '@example.invalid' } }),
      0,
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: active.id } })).quantiteStock,
      3,
    );
    checks.push(
      'Archive after quote rejects checkout without order, account or stock debit',
    );
    fs.writeFileSync(
      path.join(
        root,
        'docs/refonte-e/captures/verification-archives-preproduction.json',
      ),
      JSON.stringify(
        { date: new Date().toISOString(), productionTouched: false, checks },
        null,
        2,
      ),
    );
    console.log(`${checks.length} real archived-product checks passed.`);
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
