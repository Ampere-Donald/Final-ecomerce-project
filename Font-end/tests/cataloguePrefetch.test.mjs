import test from 'node:test';
import assert from 'node:assert/strict';
import { startCataloguePrefetch, cataloguePrefetch } from '../src/storefront/cataloguePrefetch.js';
import { catalogueQuery, canRenderCatalogue } from '../src/storefront/catalogueQuery.js';
import { catalogueLeadImage } from '../src/storefront/catalogueLeadImage.js';
import { cardImage } from '../src/storefront/cardImage.js';

function browser(path = '/catalogue', { server = false, fetcher } = {}) {
  const timers = new Map(), calls = [];
  let id = 0;
  const win = {
    URL, URLSearchParams, AbortController,
    location: new URL(path, 'https://newoteg.com'),
    document: { getElementById: () => ({ getAttribute: () => server ? 'fr' : null }) },
    setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) {
      calls.push({ url, options });
      return fetcher ? fetcher(url, options) : Promise.resolve({ ok: true, json: async () => ({ source: url }) });
    },
  };
  return { win, timers, calls };
}
const start = win => startCataloguePrefetch(win, 'https://api.newoteg.com', catalogueQuery, canRenderCatalogue);

test('only supported public catalogue URLs start credential-free GETs with identical filters', async () => {
  const { win, calls } = browser('/catalogue?search=c%C3%A2ble+HDMI&sort=price-asc&instock=true&page=2&minPrice=500');
  start(win);
  const path = catalogueQuery(win.location.searchParams).path;
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.newoteg.com/api' + path);
  assert.equal(calls[1].url, 'https://api.newoteg.com/api/categories');
  for (const { options } of calls) {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.body, undefined);
    assert.equal(options.method, undefined); // Fetch's GET default.
  }
  assert.deepEqual(await cataloguePrefetch(path, win), { data: { source: calls[0].url } });
  assert.equal(cataloguePrefetch('/produits?different=true', win), null);
});

test('private/other/unsupported routes and server snapshots do not start a read', () => {
  for (const path of ['/', '/panier', '/suivi-commande', '/mon-compte', '/catalogue?token=private', '/catalogue?page=1.5', '/catalogue?sort=invalid']) {
    const { win, calls } = browser(path); start(win); assert.equal(calls.length, 0, path);
  }
  const { win, calls } = browser('/catalogue', { server: true }); start(win); assert.equal(calls.length, 0);
  const legacy = browser(); delete legacy.win.AbortController; start(legacy.win); assert.equal(legacy.calls.length, 0);
});

test('failed or malformed responses resolve without an unhandled rejection and permit normal retry', async () => {
  for (const fetcher of [
    () => { throw new Error('synchronous network failure'); },
    async () => { throw new Error('offline'); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }),
  ]) {
    const { win, timers } = browser('/catalogue', { fetcher }); start(win);
    assert.equal(await cataloguePrefetch(catalogueQuery(win.location.searchParams).path, win), null);
    assert.equal([...timers.values()].filter(t => t.delay === 8000).length, 0);
  }
});

test('slow requests are aborted and expired resources are discarded rather than reused', async () => {
  const { win, timers, calls } = browser('/catalogue', { fetcher: (url, { signal }) =>
    new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  start(win);
  for (const timer of [...timers.values()].filter(t => t.delay === 8000)) timer.fn();
  assert(calls.every(c => c.options.signal.aborted));
  assert.equal(await cataloguePrefetch(catalogueQuery(win.location.searchParams).path, win), null);
  const path = '/categories';
  win.__newotegCataloguePrefetch.at = Date.now() - 15001;
  assert.equal(cataloguePrefetch(path, win), null);
  win.__newotegCataloguePrefetch.at = Date.now() + 10000;
  assert.equal(cataloguePrefetch(path, win), null);
  for (const timer of timers.values()) if (timer.delay === 15000) timer.fn();
  assert.equal(win.__newotegCataloguePrefetch, undefined);
  assert.equal(cataloguePrefetch(path, win), null);
});

test('first-image preload uses the same responsive card URL and rejects other hosts or originals', () => {
  const image = 'https://res.cloudinary.com/dm4ij9sxg/image/upload/v123/produits/fixture.webp';
  assert.deepEqual(catalogueLeadImage({data:[{imageUrl:image}]}),cardImage(image));
  assert.deepEqual(catalogueLeadImage([{imageUrl:'/product-images/fixture.webp'}]),{src:'/product-images/fixture.webp'});
  for(const imageUrl of ['https://other.example/image.webp','https://res.cloudinary.com/other/image/upload/v1/produits/image.webp','/uploads/original.jpg','javascript:invalid',null])
    assert.equal(catalogueLeadImage({data:[{imageUrl}]}),null);
  assert.equal(catalogueLeadImage({data:[]}),null);
});

test('optional image hints preserve data, skip unsupported responsive preloads and stop after navigation', async () => {
  const data = {data:[{imageUrl:'https://res.cloudinary.com/dm4ij9sxg/image/upload/v123/produits/fixture.webp'}]};
  for(const mode of ['supported','unsupported','dom-error','navigated']) {
    const {win}=browser('/catalogue',{fetcher:async()=>({ok:true,json:async()=>data})});
    const links=[];
    win.document.head={appendChild:link=>links.push(link)};
    win.document.createElement=()=>{
      if(mode==='dom-error')throw new Error('Optional DOM hint unavailable');
      return mode==='unsupported'?{}:{imageSrcset:'',setAttribute(){}};
    };
    startCataloguePrefetch(win,'/api',catalogueQuery,canRenderCatalogue,catalogueLeadImage);
    if(mode==='navigated')win.location=new URL('https://newoteg.com/catalogue?sort=price-desc');
    const result=await cataloguePrefetch('/produits?page=1&limit=24&sort=name_asc',win);
    assert.deepEqual(result,{data});
    assert.equal(links.length,mode==='supported'?1:0);
    if(links.length)assert.equal(links[0].imageSrcset,cardImage(data.data[0].imageUrl).srcSet);
  }
});
