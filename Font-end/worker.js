// Worker Cloudflare : sert les assets du site et proxifie l'API.
//
// Les appels /api/* et /uploads/* sont relayés côté serveur vers le backend
// Railway. Le navigateur ne parle ainsi qu'au domaine du site (certificat
// Cloudflare reconnu par les anciens Android, contrairement au certificat
// Let's Encrypt de Railway, rejeté avant Android 7.1.1). Résout aussi CORS.
const BACKEND = 'https://api.newoteg.com';
import { isPrivateDocument } from './src/storefront/routeMetadata.js';
import { isApplicationDocument } from './src/storefront/documentRoutes.js';

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
    const response = await env.ASSETS.fetch(request);
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
    return isPrivateDocument(url.pathname) ? privateResponse(response) : response;
  },
};
