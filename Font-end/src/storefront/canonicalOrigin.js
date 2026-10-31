import { SITE_ORIGIN, isPrivateDocument } from './routeMetadata.js';
import { isApplicationDocument } from './documentRoutes.js';

// Consolidate only public storefront documents. Keep existing private browser
// sessions, API requests, media and local previews on their current origin.
export function canonicalDocumentRedirect(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['newoteg.com', 'www.newoteg.com'].includes(url.hostname) ||
      url.username || url.password || url.origin === SITE_ORIGIN ||
      isPrivateDocument(url.pathname) || !isApplicationDocument(url.pathname)) return null;
  // Set pathname on a fixed origin: a path beginning // must never become an
  // external authority, and request headers/query values never choose the host.
  const target = new URL(SITE_ORIGIN);
  target.pathname = url.pathname;
  target.search = url.search;
  return new Response(null, { status: 308, headers: {
    Location: target.href, 'Cache-Control': 'public, max-age=300',
  } });
}
