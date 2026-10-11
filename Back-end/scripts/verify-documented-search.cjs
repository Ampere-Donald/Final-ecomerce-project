// Called only inside the owned local provenance recipe, never on the shop DB.
const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async ({ db, root, request, tokens, ok }) => {
  const [owner] = await db.$queryRawUnsafe('SELECT current_database() AS name, host(inet_server_addr()) AS host, inet_server_port() AS port');
  assert.match(owner.name, /^newoteg_tech_[a-f0-9]{32}$/);
  assert.equal(owner.host, '127.0.0.1'); assert.equal(owner.port, 55439);
  const { ProduitService } = require(path.join(root, 'dist/src/produit/produit.service'));
  const { ProduitController } = require(path.join(root, 'dist/src/produit/produit.controller'));
  const service = new ProduitService(db, null, null, null);
  const controller = new ProduitController(service, null);
  const category = await db.categorie.create({ data: { nom: 'Search fixtures only' } });
  const otherCategory = await db.categorie.create({ data: { nom: 'Other search fixtures' } });
  const product = (name, more = {}) => db.produit.create({ data: { categorieId: category.id, nomProduit: name, prixDetail: 1000, quantiteStock: 3, cmupActuel: 555, ...more } });
  const exact = await product('Fixture manufacturer');
  const alias = await product('Fixture alias');
  const internal = await product('Fixture internal', { code: 'ZX-900-P', codeFamille: 'ZX' });
  const named = await product('ZX 900 P');
  const suffix = await product('Fixture other suffix');
  const reviewer = (await db.adminUser.findFirst({ where: { role: 'ADMIN' } })).id;
  async function annotate(p, key, value, more = {}) {
    const a = await db.attribut.create({ data: { produitId: p.id, nomAttribut: 'Identité ' + value, typeAttribut: 'TEXTE', cleTechnique: key } });
    const v = await db.valeurAttribut.create({ data: { attributId: a.id, valeur: value } });
    const d = await db.documentationValeur.create({ data: { valeurId: v.id, valeurVersion: v.version, attributVersion: a.version, produitVersion: p.version, valeurSource: value, etat: 'DOCUMENTE', reluParId: reviewer, reluLe: new Date(), sourceUrl: 'https://manufacturer.example/fixture.pdf', sourceDocument: 'Synthetic only', sourceRepere: 'Page 1', motif: 'Synthetic test only', ...more } });
    return { a, v, d };
  }
  const ref = await annotate(exact, 'REFERENCE_FABRICANT', 'ZX-900-P');
  const synonym = await annotate(alias, 'ALIAS_RECHERCHE', 'ZX 900 P');
  await annotate(suffix, 'REFERENCE_FABRICANT', 'ZX-900-PB');
  async function results(search, salesSearch = false, filters = {}) {
    return controller.findAll({}, undefined, '20', search, filters.categoryId, undefined, undefined, filters.minPrice?.toString(), filters.maxPrice?.toString(), filters.inStock ? 'true' : 'false', filters.sort, salesSearch ? 'true' : 'false');
  }
  // Service path matches the public controller's frozen pricing and SQL filters.
  async function ids(search, salesSearch = false, filters = {}) {
    const result = await results(search, salesSearch, filters);
    for (const p of result.data) {
      assert.equal('cmupActuel' in p, false);
      assert.equal('dernierCoutAchatFcfa' in p, false);
      assert.equal(JSON.stringify(p).includes('reluParId'), false);
    }
    return result.data.map(p => p.id);
  }
  for (const suggestions of [false, true]) {
    assert.deepEqual((await ids('zx-900-p', suggestions)).slice(0, 4), [internal.id, exact.id, named.id, alias.id]);
    assert.equal((await ids('ZX-900-P', suggestions)).includes(suffix.id), false);
    assert.equal((await ids('ZX-900-PB', suggestions)).includes(exact.id), false);
    assert.equal((await ids('ZX900P', suggestions)).includes(exact.id), false);
    assert.equal((await ids('zx - 900 - p', suggestions)).includes(exact.id), true);
    assert.equal((await ids('%_ --', suggestions)).length, 0);
    assert.equal((await ids("' OR 1=1 --", suggestions)).includes(exact.id), false);
    assert.equal((await ids('ZX-900-P', suggestions, { categoryId: otherCategory.id })).length, 0);
    assert.equal((await ids('ZX-900-P', suggestions, { minPrice: 2000 })).length, 0);
  }
  ok('Real paginated/suggestion SQL ranks internal code, documented reference, exact name and alias; suffixes and filters preserved');
  // Review state alone cannot make an alias searchable. Ordinary attributes and
  // unreviewed imported values also stay out of these additional search fields.
  const hidden = await product('Fixture unknown identity');
  for (const [key, value, more] of [
    ['ALIAS_RECHERCHE', 'Only draft 991', { etat: 'A_VERIFIER' }],
    ['REFERENCE_FABRICANT', 'Only unknown 992', { etat: 'INCONNU' }],
    ['REFERENCE_FABRICANT', 'Only conflict 993', { etat: 'CONTRADICTOIRE' }],
    ['REFERENCE_FABRICANT', 'Only missing reviewer 994', { reluParId: null }],
    ['REFERENCE_FABRICANT', 'Only missing date 995', { reluLe: null }],
    [null, 'Only ordinary 996', {}],
  ]) {
    await annotate(hidden, key, value, more);
    for (const suggestions of [false, true]) assert.equal((await ids(value, suggestions)).length, 0);
  }
  ok('Unknown, draft, contradictory, unstamped and ordinary values are excluded from both search paths');
  for (const [model, where] of [
    ['valeurAttribut', { id: ref.v.id }],
    ['attribut', { id: ref.a.id }],
    ['produit', { id: exact.id }],
  ]) {
    await db[model].update({ where, data: { version: { increment: 1 } } });
    for (const suggestions of [false, true]) assert.equal((await ids('ZX-900-P', suggestions)).includes(exact.id), false);
    // Reset only owned fixtures to exercise each invalidation separately.
    await db[model].update({ where, data: { version: 1 } });
  }
  await db.attribut.update({ where: { id: synonym.a.id }, data: { cleTechnique: null, version: { increment: 1 } } });
  for (const suggestions of [false, true]) assert.equal((await ids('ZX-900-P', suggestions)).includes(alias.id), false);
  ok('Value, attribute and product edits invalidate references; clearing the key withdraws an alias immediately');
  await db.produit.update({ where: { id: exact.id }, data: { quantiteStock: 0 } });
  for (const suggestions of [false, true]) assert.equal((await ids('ZX-900-P', suggestions, { inStock: true })).includes(exact.id), false);
  await db.produit.update({ where: { id: exact.id }, data: { quantiteStock: 3, estActif: false } });
  for (const suggestions of [false, true]) assert.equal((await ids('ZX-900-P', suggestions)).includes(exact.id), false);
  ok('Documented identity never bypasses stock or archived-product filters');
  const create = { produitId: hidden.id, nomAttribut: 'HTTP key', typeAttribut: 'TEXTE', cleTechnique: 'ALIAS_RECHERCHE' };
  assert.equal((await request('POST', '/attributs', create)).status, 401);
  assert.equal((await request('POST', '/attributs', create, tokens.VENDEUR)).status, 403);
  assert.equal((await request('POST', '/attributs', { ...create, cleTechnique: 'INVALID' }, tokens.ADMIN)).status, 400);
  const accepted = await request('POST', '/attributs', create, tokens.ADMIN);
  assert.equal(accepted.status, 201); assert.equal(accepted.data.cleTechnique, 'ALIAS_RECHERCHE');
  assert.equal((await request('PATCH', '/attributs/' + accepted.data.id, { cleTechnique: null }, tokens.ADMIN)).status, 200);
  ok('Actual HTTP/JWT permits explicit admin dictionary keys, rejects unknown keys and permits clearing without backfill');
};
