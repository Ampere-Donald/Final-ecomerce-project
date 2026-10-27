import { renderCatalogue } from './serverCatalogue';
import { catalogueQuery, canRenderCatalogue } from './catalogueQuery';
import { publicCatalogueData, publicCategories, catalogueBootJSON } from './initialCatalogue';
export { parseProductRequest, renderProductResponse } from './serverProduct';
export { renderSitemapResponse } from './publicSitemap';

export function parseCatalogueRequest(text) {
  if (typeof text !== 'string' || text.length > 2200 || !/^\/catalogue(?:\/[a-z-]+)?(?:\?.*)?$/.test(text)) throw Error('Invalid catalogue URL');
  const url = new URL(text, 'https://newoteg.com');
  if (url.hash || url.pathname + url.search !== text || !canRenderCatalogue(url)) throw Error('Invalid catalogue URL');
  const query = catalogueQuery(url.searchParams, url.pathname);
  return { url: text, path: query.path };
}

export function renderCatalogueResponse(text, products, categories, at) {
  const { url, path } = parseCatalogueRequest(text);
  const snapshot = { version: 1, url, at, resources: {
    [path]: publicCatalogueData(products), '/categories': publicCategories(categories),
  } };
  if (!Number.isSafeInteger(at) || at < 0 || new TextEncoder().encode(catalogueBootJSON(snapshot)).length > 256 * 1024)
    throw Error('Invalid catalogue snapshot');
  const html = renderCatalogue(snapshot);
  return `<div id="root" data-initial-catalogue="fr">${html}</div>` +
    `<script type="application/json" id="initial-catalogue-data">${catalogueBootJSON(snapshot)}</script>`;
}
