import test from 'node:test';
import assert from 'node:assert/strict';
import { pathLanguage, basePath, localizedPath } from '../src/storefront/localePath.js';
import { hasEnglishRoute, languageDestination } from '../src/storefront/localeRoutes.js';
import { pageMetadata } from '../src/storefront/routeMetadata.js';
import { productEnglishTranslations } from '../src/storefront/productEnglish.generated.js';
import { getProductTranslation } from '../src/storefront/productTranslation.js';
import { preparedEnglishGuides } from '../src/storefront/guidesEnglish.generated.js';
import { seoFamilies, familyPath } from '../src/storefront/seoFamilies.js';
import { publicRecord, recordMetadata } from '../src/storefront/recordMetadata.js';
import { productSnapshot, readProductBoot, injectProductFragment } from '../src/storefront/initialProduct.js';
import { renderSitemapResponse } from '../src/storefront/publicSitemap.js';
import { injectInitialHome } from '../src/storefront/initialHome.js';
import { productSchema } from '../src/storefront/productSchema.js';
import { adaptProduct } from '../src/storefront/productData.js';
import worker from '../worker.js';

const entry = productEnglishTranslations[0];
const raw = { id: entry.id, estActif: true, nomProduit: entry.expected.model,
  imageUrl: entry.expected.image, description: entry.expected.description, marque: entry.expected.brand,
  urlDatasheet: entry.expected.urlDatasheet, attributs: [] };
const response = value => Response.json(value);
const document = '<html lang="fr"><head></head><body><div id="root"></div></body></html>';
const assets = { ASSETS: { fetch: async () => new Response(document, { headers: { 'content-type': 'text/html' } }) } };

test('URL language and alternate navigation retain filters without creating untranslated product routes', () => {
  assert.equal(pathLanguage('/en/catalogue'), 'en');
  assert.equal(pathLanguage('/enough'), 'fr');
  assert.equal(basePath('/en/'), '/');
  assert.equal(localizedPath('/en/catalogue', 'en'), '/en/catalogue');
  assert.equal(languageDestination('/en/catalogue', '?page=2&instock=true', '#results', 'fr'), '/catalogue?page=2&instock=true#results');
  assert.equal(languageDestination('/product/' + raw.id, '', '', 'en'), '/en/product/' + raw.id);
  assert.equal(hasEnglishRoute('/product/ee76f44c-97f3-487c-8b7b-b53801c851e4'), false);
  assert.equal(languageDestination('/product/ee76f44c-97f3-487c-8b7b-b53801c851e4', '', '', 'en'), '/en/');
  assert.equal(languageDestination('/product/ee76f44c-97f3-487c-8b7b-b53801c851e4', '?private=value', '#detail', 'en'), '/en/');
});

test('families and guides have reciprocal self-inclusive metadata; filtered and private pages do not', () => {
  const paths = ['/', ...seoFamilies.map(familyPath), ...preparedEnglishGuides.map(entry => '/guides/' + entry.slug)];
  for (const path of paths) {
    for (const lang of ['fr', 'en']) {
      const actual = localizedPath(path, lang), meta = pageMetadata(actual);
      assert.equal(meta.lang, lang);
      assert.equal(meta.canonical, 'https://newoteg.com' + actual);
      assert.deepEqual(meta.alternates, ['fr', 'en'].map(lang => ({ lang, href: 'https://newoteg.com' + localizedPath(path, lang) })));
    }
  }
  const pagination = pageMetadata('/en/catalogue/condensateurs', '?page=2');
  assert(pagination.canonical.endsWith('/en/catalogue/condensateurs?page=2'));
  assert(pagination.alternates.every(entry => entry.href.endsWith('?page=2')));
  for (const [path, search] of [['/en/catalogue', '?search=private'], ['/en/catalogue/multimetres', '?instock=true'], ['/en/checkout', '?returnTo=x'], ['/en/commandes/private-id', ''], ['/en/guides/missing', '']]) {
    const meta = pageMetadata(path, search);
    assert.match(meta.robots, /noindex/); assert.deepEqual(meta.alternates, []);
  }
});

test('live identity controls both languages and the English sitemap, including added technical attributes', async () => {
  const path = '/product/' + raw.id;
  for (const lang of ['fr', 'en']) {
    const result = await recordMetadata(publicRecord(localizedPath(path, lang)), async () => response(raw));
    assert.equal(result.status, 200);
    assert.equal(result.metadata.canonical, 'https://newoteg.com' + localizedPath(path, lang));
    assert.equal(result.metadata.alternates.length, 2);
    assert.equal(result.metadata.title, (lang === 'en' ? entry.en.name : raw.nomProduit) + ' — X-Electronic');
  }
  assert(renderSitemapResponse([raw]).includes('/en' + path));
  for (const changed of [{ ...raw, description: 'Changed source' }, { ...raw, attributs: [{ id: 'new' }] }]) {
    assert.equal(getProductTranslation(adaptProduct(changed, value => value)), null);
    const english = await recordMetadata(publicRecord('/en' + path), async () => response(changed));
    assert.equal(english.status, 404); assert.equal(english.metadata.canonical, null);
    const french = await recordMetadata(publicRecord(path), async () => response(changed));
    assert.equal(french.status, 200); assert.deepEqual(french.metadata.alternates, []);
    const xml = renderSitemapResponse([changed]);
    assert(xml.includes('https://newoteg.com' + path + '</loc>')); assert(!xml.includes('/en' + path));
  }
});

test('English unknown records never start a lookup and private documents retain no-store before JavaScript', async () => {
  const unknown = publicRecord('/en/product/ee76f44c-97f3-487c-8b7b-b53801c851e4');
  assert.equal((await recordMetadata(unknown, () => { throw Error('Unexpected lookup'); })).status, 404);
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/en/checkout', '/en/suivi-invite', '/en/mes-devis/secret/imprimer', '/en/profile/unknown']) {
      const result = await worker.fetch(new Request('https://newoteg.com' + path, { method }), assets);
      assert.match(result.headers.get('cache-control'), /no-store/);
      assert.equal(result.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
      const body = await result.text();
      if (method === 'HEAD') assert.equal(body, '');
      else { assert(body.includes('lang="en"')); assert(!body.includes('rel="canonical"')); assert(!body.includes('hreflang=')); }
    }
  }
});

test('boot and fragment envelopes cannot cross language, path or identity', () => {
  const url = new URL('https://newoteg.com/en/product/' + raw.id);
  const snapshot = productSnapshot(url, raw);
  assert(readProductBoot(JSON.stringify(snapshot), url));
  assert.equal(readProductBoot(JSON.stringify(snapshot), new URL('https://newoteg.com/product/' + raw.id)), null);
  const fragment = '<div id="root" data-initial-product="en"><div class="app"><script type="application/ld+json" data-product-schema="true">{}</script></div></div><script type="application/json" id="initial-product-data">{}</script>';
  assert.throws(() => injectProductFragment(document, fragment, ['/assets/test.css'], 'fr'));
  assert(injectProductFragment(document, fragment, ['/assets/test.css'], 'en').includes('data-initial-product="en"'));
  const home = { version: 1, language: 'en', html: '<div class="app">English home</div>', css: ['/assets/test.css'] };
  assert.equal(injectInitialHome(document, home, 'fr'), document);
  assert(injectInitialHome(document, home, 'en').includes('data-initial-home="en"'));
});

test('English product schema and every breadcrumb resolve to the displayed language', () => {
  const schema = productSchema(adaptProduct(raw, value => value), 'en');
  assert.equal(schema['@graph'][0].url, 'https://newoteg.com/en/product/' + raw.id);
  assert.equal(schema['@graph'][0].name, entry.en.name);
  assert(schema['@graph'][1].itemListElement.every(entry => entry.item.startsWith('https://newoteg.com/en/')));
});

test('English aliases redirect once and unknown English pages are genuine 404s', async () => {
  for (const [path, target] of [['/en', '/en/'], ['/EN/CATALOGUE/CONDENSATEURS/', '/en/catalogue/condensateurs']]) {
    const result = await worker.fetch(new Request('https://newoteg.com' + path + '?page=2'), assets);
    assert.equal(result.status, 308); assert.equal(result.headers.get('location'), 'https://newoteg.com' + target + '?page=2');
  }
  for (const path of ['/en/missing', '/en/remplacement', '/en/catalogue/missing-family', '/en/guides/draft']) {
    const result = await worker.fetch(new Request('https://newoteg.com' + path), assets);
    assert.equal(result.status, 404);
    const body = await result.text(); assert(body.includes('lang="en"')); assert(!body.includes('rel="canonical"'));
  }
});
