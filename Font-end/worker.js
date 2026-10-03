// Worker Cloudflare : sert les assets du site et proxifie l'API.
//
// Les appels /api/* et /uploads/* sont relayés côté serveur vers le backend
// Railway. Le navigateur ne parle ainsi qu'au domaine du site (certificat
// Cloudflare reconnu par les anciens Android, contrairement au certificat
// Let's Encrypt de Railway, rejeté avant Android 7.1.1). Résout aussi CORS.
const BACKEND = 'https://api.newoteg.com';

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
      return url.pathname.startsWith('/api/commandes/guest/') ? privateResponse(response) : response;
    }
    const response = await env.ASSETS.fetch(request);
    return /^\/suivi-invite(?:\/|$)/.test(url.pathname) ? privateResponse(response) : response;
  },
};
