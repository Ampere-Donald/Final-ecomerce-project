// Worker Cloudflare : sert les assets du site et proxifie l'API.
//
// Les appels /api/* et /uploads/* sont relayés côté serveur vers le backend
// Railway. Le navigateur ne parle ainsi qu'au domaine du site (certificat
// Cloudflare reconnu par les anciens Android, contrairement au certificat
// Let's Encrypt de Railway, rejeté avant Android 7.1.1). Résout aussi CORS.
const BACKEND = 'https://api.newoteg.com';
import { isPrivateDocument } from './src/storefront/routeMetadata.js';
import { isApplicationDocument } from './src/storefront/documentRoutes.js';
import { staticPublicMetadata, renderFallbackMetadata } from './src/storefront/serverMetadata.js';
import { publicRecord, recordMetadata } from './src/storefront/recordMetadata.js';
import { injectInitialHome } from './src/storefront/initialHome.js';

function privateResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
      const target = new URL(url.pathname + url.search, BACKEND);
      const response = await fetch(new Request(target, request));
      return /^\/api\/(commandes|avis|incompatibilites)\/guest(?:\/|$)/i.test(url.pathname) ? privateResponse(response) : response;
    }
    const metadata = request.method === 'GET' ? staticPublicMetadata(url) : null;
    const record = ['GET', 'HEAD'].includes(request.method) ? publicRecord(url.pathname) : null;
    let assetRequest = request;
    if (metadata || record) {
      // The asset ETag describes shared index.html, not this route's metadata.
      const headers = new Headers(request.headers);
      headers.delete('If-None-Match');
      headers.delete('If-Modified-Since');
      assetRequest = new Request(request, { headers });
    }
    const response = await env.ASSETS.fetch(assetRequest);
    if (record && response.status === 200 && response.headers.get('content-type')?.includes('text/html')) {
      const resolved = await recordMetadata(record);
      const headers = new Headers(response.headers);
      for (const key of ['ETag', 'Last-Modified', 'Content-Length', 'Content-Encoding']) headers.delete(key);
      // Never cache a removed reference or an outage as a durable public page.
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Robots-Tag', resolved.metadata.robots);
      if (resolved.status === 503) headers.set('Retry-After', '60');
      return new Response(request.method === 'HEAD' ? null : renderFallbackMetadata(await response.text(), resolved.metadata),
        { status: resolved.status, headers });
    }
    // The asset SPA fallback serves index.html with 200 even for unknown URLs.
    // Keep its body so React renders the useful NotFound page, but report 404
    // before JavaScript executes. Never rewrite assets, redirects or errors.
    if (['GET', 'HEAD'].includes(request.method) && response.status === 200 &&
        response.headers.get('content-type')?.includes('text/html') &&
        !isApplicationDocument(url.pathname)) {
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      headers.set('Cache-Control', 'no-store');
      headers.delete('ETag');
      headers.delete('Last-Modified');
      const missing = new Response(request.method === 'HEAD' ? null : response.body,
        { status: 404, statusText: 'Not Found', headers });
      return isPrivateDocument(url.pathname) ? privateResponse(missing) : missing;
    }
    if (request.method === 'GET' && response.status === 200 &&
        response.headers.get('content-type')?.includes('text/html')) {
      if (metadata) {
        const headers = new Headers(response.headers);
        headers.delete('ETag');
        headers.delete('Last-Modified');
        headers.delete('Content-Length');
        headers.delete('Content-Encoding');
        headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
        let html = renderFallbackMetadata(await response.text(), metadata);
        if (url.pathname === '/') {
          try {
            const snapshot = await env.ASSETS.fetch(new Request(new URL('/__public-home.json', url.origin)));
            if (snapshot.ok && snapshot.headers.get('content-type')?.includes('application/json'))
              html = injectInitialHome(html, await snapshot.json());
          } catch { /* Older asset versions retain the existing client-rendered fallback. */ }
        }
        return new Response(html, { headers });
      }
    }
    return isPrivateDocument(url.pathname) ? privateResponse(response) : response;
  },
};
