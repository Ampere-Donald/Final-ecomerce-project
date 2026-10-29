// Reuse the storefront's existing API proxy in production. Keep the configured
// media origin and server-renderer configuration unchanged; this only selects
// the browser transport for catalogue GETs, without adding a cache.
export function catalogueTransportBase(configured, location) {
  if (typeof configured !== 'string') return configured;
  if (location?.protocol === 'https:' &&
      (location.hostname === 'newoteg.com' || location.hostname === 'www.newoteg.com') &&
      /^https:\/\/api\.newoteg\.com(?:\/api)?\/?$/.test(configured)) return '/api';
  return configured;
}

export function isCatalogueRead(method, path) {
  if (method && method.toLowerCase() !== 'get') return false;
  if (typeof path !== 'string' || path.includes('#')) return false;
  return /^\/(?:categories|produits)(?:\?[^#]*)?$/.test(path) ||
    /^\/produits\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path);
}
