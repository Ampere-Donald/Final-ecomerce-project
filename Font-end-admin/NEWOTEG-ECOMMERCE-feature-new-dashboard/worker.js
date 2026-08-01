// Worker Cloudflare : sert les assets du site et proxifie l'API.
//
// Les appels /api/* et /uploads/* sont relayés côté serveur vers le backend
// Railway. Le navigateur ne parle ainsi qu'au domaine du site (certificat
// Cloudflare reconnu par les anciens Android, contrairement au certificat
// Let's Encrypt de Railway, rejeté avant Android 7.1.1). Résout aussi CORS.
const BACKEND = 'https://api.newoteg.com';
const ADMIN_ORIGIN = 'https://admin.newoteg.com';
const PRINTER_SETUP_PATH = '/downloads/Newoteg-Printer-Setup.exe';
const QZ_HASH_PATTERN = /^[a-f0-9]{64}$/i;
const encoder = new TextEncoder();

let qzSigningKeyPromise;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function pemToBytes(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  if (!base64) throw new Error('QZ signing key is empty.');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getQzSigningKey(privateKeyPem) {
  if (!qzSigningKeyPromise) {
    qzSigningKeyPromise = crypto.subtle.importKey(
      'pkcs8',
      pemToBytes(privateKeyPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
      false,
      ['sign'],
    );
  }
  return qzSigningKeyPromise;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function validateAdminSession(request) {
  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return false;

  // The cache key contains only a one-way token digest. A short TTL avoids an
  // authentication request for every QZ call while keeping revocation prompt.
  const tokenDigest = await sha256Hex(authorization);
  const cacheKey = new Request(`https://qz-auth-cache.newoteg.internal/${tokenDigest}`);
  try {
    const cached = await caches.default.match(cacheKey);
    if (cached) return true;
  } catch {
    // Authentication still works if the edge cache is temporarily unavailable.
  }

  const authResponse = await fetch(`${BACKEND}/api/admin-auth/me`, {
    method: 'GET',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'X-Request-Id': request.headers.get('X-Request-Id') || crypto.randomUUID(),
    },
  });
  if (!authResponse.ok) return false;

  try {
    await caches.default.put(cacheKey, new Response('authorized', {
      headers: { 'Cache-Control': 'public, max-age=30' },
    }));
  } catch {
    // Do not turn a cache outage into a checkout outage.
  }
  return true;
}

async function handleQzSignature(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ message: 'Method not allowed.' }, 405);
  }

  const origin = request.headers.get('Origin');
  if (origin && origin !== ADMIN_ORIGIN) {
    return jsonResponse({ message: 'Origin not allowed.' }, 403);
  }

  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > 1024) return jsonResponse({ message: 'Request too large.' }, 413);
  if (!env.QZ_PRIVATE_KEY_PEM) {
    return jsonResponse({ message: 'QZ signing is not configured.' }, 503);
  }

  let body;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 1024) return jsonResponse({ message: 'Request too large.' }, 413);
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ message: 'Invalid JSON.' }, 400);
  }

  const hash = typeof body?.request === 'string' ? body.request.trim() : '';
  if (!QZ_HASH_PATTERN.test(hash)) {
    return jsonResponse({ message: 'Invalid QZ request hash.' }, 400);
  }
  if (!(await validateAdminSession(request))) {
    return jsonResponse({ message: 'Authentication required.' }, 401);
  }

  const key = await getQzSigningKey(env.QZ_PRIVATE_KEY_PEM);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(hash));
  return jsonResponse({ signature: bytesToBase64(new Uint8Array(signature)) });
}

async function servePrinterSetup(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;

  const headers = new Headers(asset.headers);
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', 'attachment; filename="Newoteg-Printer-Setup.exe"');
  headers.set('Cache-Control', 'public, max-age=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(asset.body, {
    status: asset.status,
    statusText: asset.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Les anciens navigateurs Android n'activent pas toutes les API de
    // sécurité sur une page HTTP. Forcer HTTPS avant de servir l'application
    // évite une interface chargée mais incapable d'envoyer la connexion.
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === '/api/qz/sign') {
      return handleQzSignature(request, env);
    }

    if (url.pathname === PRINTER_SETUP_PATH) {
      return servePrinterSetup(request, env);
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
      // Compatibilite avec les anciens bundles/PWA : avant la reunification,
      // le scan camera appelait /scan-code alors que le backend actuellement
      // deploye expose /scan-raw. Les deux lecteurs utilisent desormais la
      // meme recherche sans obliger les appareils a vider leur cache d'abord.
      const backendPath = url.pathname.replace(
        /^\/api\/produits\/scan-code\//,
        '/api/produits/scan-raw/',
      );
      const target = new URL(backendPath + url.search, BACKEND);
      return fetch(new Request(target, request));
    }
    return env.ASSETS.fetch(request);
  },
};
