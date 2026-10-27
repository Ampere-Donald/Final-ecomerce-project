// Local, read-only acceptance server for the built client and release-owned
// renderer. No cookies/auth are forwarded and no production write is possible.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { catalogueSnapshot, injectInitialCatalogue } from '../src/storefront/initialCatalogue.js';
import { productDocumentId, injectProductFragment } from '../src/storefront/initialProduct.js';
import { renderFallbackMetadata, staticPublicMetadata } from '../src/storefront/serverMetadata.js';
import { seoFamily } from '../src/storefront/seoFamilies.js';

const root = resolve('dist');
const runtime = createRequire(import.meta.url)(resolve('.catalogue-backend/renderer.cjs'));
const { renderCatalogue } = await import('../.catalogue-ssr/renderer.js');
const { catalogueStyles } = await import('../.catalogue-ssr/styles.js');
const port = Number(process.env.SEO_PREVIEW_PORT || 5228);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2' };
async function publicAPI(path) {
  return fetch('https://api.newoteg.com' + path, { headers: { Accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
}
const server = createServer(async (request, response) => {
  const send = (status, type, body) => { response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' }); response.end(request.method === 'HEAD' ? undefined : body); };
  try {
    if (!['GET', 'HEAD'].includes(request.method)) return send(403, 'text/plain', 'Read-only SEO preview');
    const url = new URL(request.url, 'http://127.0.0.1:' + port);
    if (url.pathname === '/api/parcours/disponibilite') return send(200, 'application/json', '{"actif":false}');
    if (/^\/api\/(produits|categories)(?:\/|$)/.test(url.pathname) || /^\/api\/avis\/produits\//.test(url.pathname) || /^\/uploads\//.test(url.pathname)) {
      const upstream = await publicAPI(url.pathname + url.search);
      return send(upstream.status, upstream.headers.get('content-type') || 'application/octet-stream', Buffer.from(await upstream.arrayBuffer()));
    }
    const id = productDocumentId(url.pathname);
    const catalogue = url.pathname === '/catalogue' || seoFamily(url.pathname);
    if (id || catalogue || url.pathname === '/') {
      let html = await readFile(resolve(root, 'index.html'), 'utf8');
      if (id) {
        const upstream = await publicAPI('/api/produits/' + id);
        if (!upstream.ok) return send(upstream.status, 'text/plain', 'Product unavailable');
        const product = await upstream.json();
        const fragment = runtime.renderProductResponse(url.pathname + url.search, product, Date.now());
        html = injectProductFragment(html, fragment, catalogueStyles);
        html = renderFallbackMetadata(html, { title: product.nomProduit + ' — X-Electronic', description: product.description || product.nomProduit, canonical: 'https://newoteg.com/product/' + id, robots: 'noindex, follow' });
      } else if (catalogue) {
        const snapshot = await catalogueSnapshot(url, fetch, 15000);
        html = injectInitialCatalogue(html, renderCatalogue(snapshot), snapshot, catalogueStyles);
        html = renderFallbackMetadata(html, staticPublicMetadata(url));
      }
      return send(200, 'text/html; charset=utf-8', html);
    }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + sep)) return send(403, 'text/plain', 'Invalid asset');
    try { return send(200, types[extname(file)] || 'application/octet-stream', await readFile(file)); }
    catch { return send(404, 'text/plain', 'Not found'); }
  } catch (error) { console.error(error.message); send(503, 'text/plain', 'Preview temporarily unavailable'); }
});
server.listen(port, '127.0.0.1', () => console.log('Read-only SSR preview http://127.0.0.1:' + port));
