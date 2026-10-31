// Worker Cloudflare : sert les assets du site et proxifie l'API.
//
// Les appels /api/* et /uploads/* sont relayés côté serveur vers le backend
// Railway. Le navigateur ne parle ainsi qu'au domaine du site (certificat
// Cloudflare reconnu par les anciens Android, contrairement au certificat
// Let's Encrypt de Railway, rejeté avant Android 7.1.1). Résout aussi CORS.
const BACKEND = 'https://api.newoteg.com';
import { isPrivateDocument, pageMetadata } from './src/storefront/routeMetadata.js';
import { basePath, pathLanguage } from './src/storefront/localePath.js';
import { hasEnglishRoute } from './src/storefront/localeRoutes.js';
import { isApplicationDocument } from './src/storefront/documentRoutes.js';
import { staticPublicMetadata, renderFallbackMetadata } from './src/storefront/serverMetadata.js';
import { publicRecord, recordMetadata } from './src/storefront/recordMetadata.js';
import { injectInitialHome } from './src/storefront/initialHome.js';
import { catalogueSnapshot, injectInitialCatalogue } from './src/storefront/initialCatalogue.js';
import { catalogueBackendFragment, injectBackendCatalogue } from './src/storefront/backendCatalogue.js';
import { seoFamily } from './src/storefront/seoFamilies.js';
import { productBackendFragment } from './src/storefront/backendProduct.js';
import { injectProductFragment } from './src/storefront/initialProduct.js';
import { sitemapResponse } from './src/storefront/publicSitemap.js';
import { injectEditorialFragment } from './src/storefront/initialEditorial.js';
import { editorialDocumentPaths } from './src/storefront/editorialRoutes.js';

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
    if (/^\/en(?:\/|$)/i.test(url.pathname) && !isPrivateDocument(url.pathname) && ['GET', 'HEAD'].includes(request.method)) {
      const normalized = url.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      const canonical = normalized === '/en' ? '/en/' : normalized;
      if (hasEnglishRoute(canonical) && canonical !== url.pathname) {
        url.pathname = canonical;
        return new Response(null, { status: 308, headers: { Location: url.href, 'Cache-Control': 'public, max-age=300' } });
      }
    }
    if (url.pathname === '/en' && ['GET', 'HEAD'].includes(request.method)) {
      url.pathname = '/en/';
      return new Response(null, { status: 308, headers: { Location: url.href, 'Cache-Control': 'public, max-age=300' } });
    }
    const normalizedEditorial = ['GET', 'HEAD'].includes(request.method)
      ? editorialDocumentPaths().find(path => path === (url.pathname.toLowerCase().replace(/\/+$/, '') || '/')) : null;
    if (normalizedEditorial && normalizedEditorial !== url.pathname) {
      url.pathname = normalizedEditorial;
      return new Response(null, { status: 308, headers: { Location: url.href, 'Cache-Control': 'public, max-age=300' } });
    }
    if (url.pathname === '/sitemap.xml' && ['GET', 'HEAD'].includes(request.method) && env.backendCatalogue)
      return sitemapResponse(request, env.backendCatalogue);
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
      const resolution = recordMetadata(record);
      // These anonymous reads are independent. Start the bounded renderer read
      // while metadata resolves instead of adding both network waits together.
      // Handle rejection immediately, including when metadata rejects the page.
      const productRender = request.method === 'GET' && record.type === 'product' && record.valid && env.backendCatalogue
        ? productBackendFragment(url, env.backendCatalogue).then(fragment => ({ fragment }), error => ({ error }))
        : null;
      const resolved = await resolution;
      const headers = new Headers(response.headers);
      for (const key of ['ETag', 'Last-Modified', 'Content-Length', 'Content-Encoding']) headers.delete(key);
      // Never cache a removed reference or an outage as a durable public page.
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Robots-Tag', resolved.metadata.robots);
      if (resolved.status === 503) headers.set('Retry-After', '60');
      let html = request.method === 'HEAD' ? null : renderFallbackMetadata(await response.text(), resolved.metadata);
      if (html && resolved.status === 200 && productRender) {
        try {
          const { fragment, error } = await productRender;
          if (error) throw error;
          if (fragment) html = injectProductFragment(html, fragment, env.catalogueStyles, pathLanguage(url.pathname));
        } catch (error) { env.reportCatalogueFailure?.(error); }
      }
      return new Response(html,
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
      const missing = new Response(request.method === 'HEAD' ? null : renderFallbackMetadata(await response.text(), pageMetadata(url.pathname, url.search)),
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
        if (env.editorialFragments) {
          const editorial = injectEditorialFragment(html, url.pathname, env.editorialFragments, env.editorialStyles);
          if (editorial) html = editorial;
        }
        const cataloguePage = basePath(url.pathname) === '/catalogue' || Boolean(seoFamily(url.pathname));
        if (cataloguePage && env.backendCatalogue) {
          try {
            const fragment = await catalogueBackendFragment(url, env.backendCatalogue);
            if (fragment) {
              html = injectBackendCatalogue(html, fragment, env.catalogueStyles);
              headers.set('Cache-Control', 'no-store');
            }
          } catch (error) { env.reportCatalogueFailure?.(error); }
        } else if (cataloguePage && typeof env.renderCatalogue === 'function') {
          try {
            const snapshot = await catalogueSnapshot(url);
            if (snapshot) {
              html = injectInitialCatalogue(html, env.renderCatalogue(snapshot), snapshot, env.catalogueStyles);
              // Products and pricing are read for this request only, never cached
              // with a client's URL or served as a build-time stock snapshot.
              headers.set('Cache-Control', 'no-store');
            }
          } catch (error) {
            // An experiment may record a bounded failure reason. Production has
            // no reporter and retains the normal API-backed error states.
            env.reportCatalogueFailure?.(error);
          }
        }
        if (basePath(url.pathname) === '/') {
          try {
            const snapshot = await env.ASSETS.fetch(new Request(new URL(pathLanguage(url.pathname) === 'en' ? '/__public-home-en.json' : '/__public-home.json', url.origin)));
            if (snapshot.ok && snapshot.headers.get('content-type')?.includes('application/json'))
              html = injectInitialHome(html, await snapshot.json(), pathLanguage(url.pathname));
          } catch { /* Older asset versions retain the existing client-rendered fallback. */ }
        }
        return new Response(html, { headers });
      }
    }
    if (isPrivateDocument(url.pathname)) {
      if (request.method === 'HEAD') return privateResponse(new Response(null, response));
      if (request.method === 'GET' && response.headers.get('content-type')?.includes('text/html'))
        return privateResponse(new Response(renderFallbackMetadata(await response.text(), pageMetadata(url.pathname, url.search)), response));
      return privateResponse(response);
    }
    return response;
  },
};
