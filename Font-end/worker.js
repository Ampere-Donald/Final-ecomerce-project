// Worker Cloudflare : sert les assets du site et proxifie l'API.
//
// Les appels /api/* et /uploads/* sont relayés côté serveur vers le backend
// Railway. Le navigateur ne parle ainsi qu'au domaine du site (certificat
// Cloudflare reconnu par les anciens Android, contrairement au certificat
// Let's Encrypt de Railway, rejeté avant Android 7.1.1). Résout aussi CORS.
const BACKEND = 'https://api.newoteg.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
      const target = new URL(url.pathname + url.search, BACKEND);
      return fetch(new Request(target, request));
    }
    return env.ASSETS.fetch(request);
  },
};
