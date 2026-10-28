import { seoFamilies, familyPath } from './seoFamilies.js';
import { productDocumentId } from './initialProduct.js';

export const publicStaticPaths = ['/', '/catalogue', '/projets', '/offres', '/arrivages', '/equivalences', '/guides', '/faq', '/livraison', '/about', '/contact', '/devis', '/terms', '/privacy'];

// No stock/prices/private documents and no invented lastmod date. Products
// currently have a creation date but no reliable public modification timestamp.
export function renderSitemapResponse(products) {
  if (!Array.isArray(products) || products.length > 49000) throw Error('Sitemap product limit exceeded');
  const ids = new Set(), familyIds = new Set();
  for (const product of products) {
    if (!product || typeof product.id !== 'string' || !productDocumentId('/product/' + product.id) ||
        typeof product.nomProduit !== 'string' || !product.nomProduit.trim() || product.estActif === false || ids.has(product.id)) throw Error('Invalid sitemap product');
    ids.add(product.id);
    for (const family of seoFamilies) {
      if (product.categorieId === family.category && product.sousCategorieId === family.subcategory) familyIds.add(family.slug);
    }
  }
  const paths = [...publicStaticPaths, ...seoFamilies.filter(f => familyIds.has(f.slug)).map(familyPath),
    ...[...ids].sort().map(id => '/product/' + id)];
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map(path => '  <url><loc>https://newoteg.com' + path + '</loc></url>').join('\n') + '\n</urlset>\n';
  return xml;
}

export async function sitemapResponse(request, descriptor, fetcher = fetch) {
  if (!/^[a-f0-9]{64}$/.test(descriptor?.rendererId)) throw Error('Invalid sitemap renderer');
  const url = new URL('https://api.newoteg.com/api/storefront/sitemap.xml');
  url.searchParams.set('renderer', descriptor.rendererId);
  try {
    const response = await fetcher(new Request(url, { method: 'GET', redirect: 'manual',
      headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(8000) }));
    if (!response.ok || !response.headers.get('content-type')?.includes('application/xml') ||
        response.headers.get('X-Catalogue-Renderer') !== descriptor.rendererId) {
      await response.body?.cancel(); throw Error('Sitemap unavailable');
    }
    const xml = await response.text();
    if (xml.length > 10 * 1024 * 1024 || !xml.startsWith('<?xml version="1.0"') || !xml.includes('</urlset>')) throw Error('Invalid sitemap');
    return new Response(request.method === 'HEAD' ? null : xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response(request.method === 'HEAD' ? null : 'Sitemap temporarily unavailable', { status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '300' } });
  }
}
