// Local recipe only. No production endpoint is contacted and every write is
// rejected. Identity fixtures come from the reviewed source, never live stock.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import worker from '../worker.js';
import { productEnglishTranslations } from '../src/storefront/productEnglish.generated.js';
import { seoFamilies } from '../src/storefront/seoFamilies.js';
const root = fileURLToPath(new URL('../', import.meta.url));

export async function localizedFixtureWorker() {
  const runtime = createRequire(import.meta.url)('../.catalogue-backend/renderer.cjs');
  const manifest = JSON.parse(await readFile(resolve(root, '.catalogue-backend/manifest.json'), 'utf8'));
  const { catalogueStyles } = await import('../.catalogue-ssr/styles.js');
  const { editorialFragments, editorialStyles } = await import('../.catalogue-ssr/editorial.js');
  const categories = [...new Map(seoFamilies.map(family => [family.category, { id: family.category, nom: family.fr }])).values()];
  const rows = productEnglishTranslations.map((entry, index) => {
    const family = seoFamilies[Math.floor(index / 4)];
    return { id: entry.id, nomProduit: entry.expected.model, description: entry.expected.description,
      imageUrl: entry.expected.image, marque: entry.expected.brand, urlDatasheet: entry.expected.urlDatasheet,
      estActif: true, categorieId: family.category, sousCategorieId: family.subcategory,
      categorie: categories.find(category => category.id === family.category),
      sousCategorie: { id: family.subcategory, nom: family.fr }, attributs: [],
      // Explicit fictional commerce, only to exercise a local cart. The other
      // nineteen fixtures verify unknown price/stock and absence of offers.
      prixPublic: index === 0 ? 1000 : null, quantiteStock: index === 0 ? 3 : null };
  });
  const calls = [], nativeFetch = globalThis.fetch;
  const json = value => Response.json(value);
  const fragment = value => new Response(value, { headers: { 'content-type': 'text/html', 'X-Catalogue-Renderer': manifest.rendererId } });
  const fixtureFetch = async (input, options) => {
    const request = input instanceof Request ? input : new Request(input, options), url = new URL(request.url);
    calls.push({ path: url.pathname, method: request.method, search: url.search });
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Local recipe refuses all writes', { status: 405 });
    if (url.origin !== 'https://api.newoteg.com') throw Error('Fixture forbids external network: ' + url.origin);
    if (url.pathname.startsWith('/api/storefront/')) {
      if (url.searchParams.get('renderer') !== manifest.rendererId) return new Response('Version mismatch', { status: 409 });
      const path = url.searchParams.get('url');
      if (url.pathname.endsWith('/product')) {
        const { id } = runtime.parseProductRequest(path);
        const raw = rows.find(row => row.id === id);
        if (!raw) return new Response('Missing fixture', { status: 404 });
        return fragment(runtime.renderProductResponse(path, raw, Date.now()));
      }
      if (url.pathname.endsWith('/catalogue')) {
        const { path: query } = runtime.parseCatalogueRequest(path);
        return fragment(runtime.renderCatalogueResponse(path, catalogue(new URL(query, url.origin).searchParams), categories, Date.now()));
      }
      if (url.pathname.endsWith('/sitemap.xml')) return new Response(runtime.renderSitemapResponse(rows), {
        headers: { 'content-type': 'application/xml', 'X-Catalogue-Renderer': manifest.rendererId } });
    }
    if (url.pathname === '/api/produits') return json(catalogue(url.searchParams));
    if (url.pathname.startsWith('/api/produits/')) {
      const raw = rows.find(row => row.id === url.pathname.split('/')[3]);
      return raw ? json(raw) : new Response('Not found', { status: 404 });
    }
    if (url.pathname === '/api/categories') return json(categories);
    if (/^\/api\/categories\/[^/]+\/sous-categories$/.test(url.pathname)) return json(seoFamilies.filter(family => family.category === url.pathname.split('/')[3]).map(family => ({ id: family.subcategory, nom: family.fr })));
    if (url.pathname === '/api/parcours/disponibilite') return json({ actif: false });
    return new Response('Not part of the anonymous fixture contract', { status: 404 });
  };
  function catalogue(params) {
    const data = rows.filter(row => (!params.get('categoryId') || row.categorieId === params.get('categoryId')) &&
      (!params.get('sousCategorieId') || row.sousCategorieId === params.get('sousCategorieId')) &&
      (!params.get('search') || row.nomProduit.toLowerCase().includes(params.get('search').toLowerCase())));
    const page = Number(params.get('page') || 1), limit = Number(params.get('limit') || 24);
    return { data: data.slice((page - 1) * limit, page * limit), meta: { total: data.length, lastPage: Math.ceil(data.length / limit), currentPage: page, perPage: limit } };
  }
  const dist = resolve(root, 'dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  const ASSETS = { fetch: async request => {
    const path = resolve(dist, '.' + decodeURIComponent(new URL(request.url).pathname));
    if (path !== dist && !path.startsWith(dist + sep)) return new Response('', { status: 404 });
    let file = path;
    let bytes;
    try { bytes = await readFile(file); }
    catch { file = resolve(dist, 'index.html'); bytes = await readFile(file); }
    let body = request.method === 'HEAD' ? null : bytes;
    if (body && extname(file) === '.html') body = body.toString().replace('<body>', '<body><aside style="background:#fff1c9;color:#503b0b;padding:10px;text-align:center" role="note">LOCAL TEST · Fictional price and stock · All requests to write data are refused</aside>');
    return new Response(body, { headers: { 'content-type': types[extname(file)] || 'application/octet-stream' } });
  } };
  globalThis.fetch = fixtureFetch;
  const env = { ASSETS, backendCatalogue: { rendererId: manifest.rendererId }, catalogueStyles, editorialFragments, editorialStyles,
    reportCatalogueFailure: error => { throw error; } };
  return { rows, calls, runtime, manifest, env, nativeFetch,
    request: (path, options) => worker.fetch(new Request(new URL(path, 'https://newoteg.com'), options), env),
    restore: () => { globalThis.fetch = nativeFetch; } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const fixture = await localizedFixtureWorker();
  const server = createServer(async (incoming, outgoing) => {
    try {
      const result = await fixture.request('http://127.0.0.1:8877' + incoming.url, { method: incoming.method, headers: incoming.headers });
      outgoing.writeHead(result.status, Object.fromEntries(result.headers));
      outgoing.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
  });
  server.listen(8877, '127.0.0.1', () => process.stdout.write('Read-only fixture Worker: http://127.0.0.1:8877 (fictional commerce, no production network)\n'));
  process.on('SIGINT', () => server.close(() => { fixture.restore(); process.exit(0); }));
}
