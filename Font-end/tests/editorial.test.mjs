import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileEditorial, editorialModule } from '../tooling/editorialModel.js';
import { verifyEditorial } from '../tooling/prepareEditorial.mjs';
import { editorialDocumentPaths, editorialMetadata, editorialPath } from '../src/storefront/editorialRoutes.js';
import { publishedEditorial } from '../src/storefront/publishedEditorial.generated.js';
import { editorialIndex } from '../src/storefront/editorialIndex.generated.js';
import { seoFamilies } from '../src/storefront/seoFamilies.js';
import { renderSitemapResponse } from '../src/storefront/publicSitemap.js';
import { injectEditorialFragment } from '../src/storefront/initialEditorial.js';
import { pageMetadata } from '../src/storefront/routeMetadata.js';
import worker from '../worker.js';
const entries = JSON.parse(await readFile(new URL('../editorial/entries.json', import.meta.url), 'utf8'));
const families = seoFamilies.map(family => family.slug);
const clone = value => structuredClone(value);

test('the generated public projection matches the reviewed registry and omits every private draft', async () => {
  const projection = await verifyEditorial();
  assert.equal(projection.length, 4);
  assert.deepEqual(projection, publishedEditorial);
  const serialized = editorialModule(projection);
  for (const entry of entries.filter(item => item.status !== 'published')) {
    assert(!serialized.includes(entry.title)); assert(!serialized.includes(entry.slug));
    assert(!JSON.stringify(editorialIndex).includes(entry.title));
    assert(!editorialDocumentPaths().includes(editorialPath(entry)));
    assert(!renderSitemapResponse([]).includes(editorialPath(entry)));
  }
  assert(!serialized.includes('publicationBlockers'));
  assert(editorialIndex.every(entry => !('sections' in entry) && !('sources' in entry)));
});

test('publication rejects incomplete, duplicate, unsafe, unreviewed and structurally invalid content', () => {
  const good = entries[0];
  const mutations = [
    entry => { entry.status = 'publish'; },
    entry => { entry.slug = '../draft'; },
    entry => { entry.language = 'en'; },
    entry => { entry.summary = ''; },
    entry => { entry.reviewedAt = '2026-02-30'; },
    entry => { entry.reviewedAt = '2099-01-01'; },
    entry => { entry.sources[0].url = 'http://example.com/source'; },
    entry => { entry.sources[0].url = 'https://user:password@example.com/source'; },
    entry => { entry.sources[0].url += '?token=private'; },
    entry => { entry.sources[0].checkedAt = '2099-01-01'; },
    entry => { entry.sections[0].sources = ['unknown']; },
    entry => { entry.sections[0].html = '<script>unsafe</script>'; },
    entry => { entry.sections[0].table = {caption:'Table', headers:['A','B'], rows:[['one']]}; },
    entry => { entry.families = ['unknown']; },
    entry => { entry.products = [{id:'../other',label:'Unknown'}]; },
    entry => { entry.price = 1000; },
    entry => { entry.publicationBlockers = ['Notice missing']; },
    entry => { entry.limits = []; },
    entry => { delete entry.review; },
  ];
  for (const mutate of mutations) {
    const entry = clone(good); mutate(entry);
    assert.throws(() => compileEditorial([entry], families, '2026-10-31'));
  }
  assert.throws(() => compileEditorial([good, good], families, '2026-10-31'));
  const collision = {...clone(good), id: 'other-id'};
  assert.throws(() => compileEditorial([good, collision], families, '2026-10-31'));
});

test('a replacement dossier cannot publish without a separately verified business case and sourced evidence', () => {
  const entry = {...clone(entries[0]), type:'replacement'};
  assert.throws(() => compileEditorial([entry], families));
  entry.replacement = {original:'Reference A', candidate:'Reference B', context:'Known application', differences:['Difference'],
    conditions:['Documented condition'], conclusion:'Scoped conclusion', validation:{status:'draft', caseId:'12cd34b9-bec9-4a1a-a67a-179ecb13b8b2',reviewedAt:'2026-10-31',evidence:['st']}};
  assert.throws(() => compileEditorial([entry], families));
  entry.replacement.validation.status = 'verified';
  assert.equal(compileEditorial([entry], families).length, 1);
  entry.replacement.validation.evidence = ['unknown'];
  assert.throws(() => compileEditorial([entry], families));
});

test('public editorial metadata, canonical and sitemap follow the publication registry rather than local language', () => {
  for (const entry of publishedEditorial) {
    const path = editorialPath(entry);
    assert.equal(editorialMetadata(path).canonical, 'https://newoteg.com' + path);
    assert.equal(pageMetadata(path, '?utm_source=example', 'en').title, entry.title + ' — NEWOTEG');
    assert(renderSitemapResponse([]).includes('<loc>https://newoteg.com' + path + '</loc>'));
  }
  assert.equal(editorialMetadata('/remplacement').robots, 'noindex, follow');
  assert(!renderSitemapResponse([]).includes('<loc>https://newoteg.com/remplacement</loc>'));
  assert.equal(editorialMetadata('/guides/draft'), null);
});

test('the edge injects only a known static publication, preserves metadata and rejects draft paths and executable fragments', async () => {
  const path = editorialPath(publishedEditorial[0]);
  const html = '<html><head></head><body><div id="root"></div></body></html>';
  const fragment = '<div id="root" data-initial-editorial="fr"><div class="app"><h1>Published body</h1></div></div>';
  const env = {ASSETS:{fetch:async () => new Response(html,{headers:{'content-type':'text/html'}})},
    editorialFragments:{[path]:fragment}, editorialStyles:['/assets/TechnicalLibrary.css']};
  const response = await worker.fetch(new Request('https://newoteg.com' + path), env);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert(body.includes('Published body')); assert(body.includes('rel="canonical"'));
  assert(body.includes('/assets/TechnicalLibrary.css')); assert(body.includes(publishedEditorial[0].title));
  for (const entry of entries.filter(item => item.status !== 'published')) {
    const response = await worker.fetch(new Request('https://newoteg.com' + editorialPath(entry)), env);
    assert.equal(response.status, 404); assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert(!(await response.text()).includes(entry.title));
  }
  const redirect = await worker.fetch(new Request('https://newoteg.com' + path.toUpperCase() + '/?utm_source=example'), env);
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get('location'), 'https://newoteg.com' + path + '?utm_source=example');
  assert.throws(() => injectEditorialFragment(html, path, {[path]:fragment + '<script>attack()</script>'}, env.editorialStyles));
  assert.throws(() => injectEditorialFragment(html, path, {}, env.editorialStyles));
  assert.equal(injectEditorialFragment(html, '/guides/draft', {}, env.editorialStyles), null);
});
