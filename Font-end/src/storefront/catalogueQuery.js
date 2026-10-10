// Shared URL contract: the server render and the browser use the same filters.
export function catalogueQuery(params) {
  const query = params.get('search') || '';
  const category = params.get('category') || '';
  const inStock = params.get('instock') === 'true';
  const sort = params.get('sort') || 'name-asc';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const apiParams = new URLSearchParams({ page: String(page), limit: '24', sort: sort.replace('-', '_') });
  if (query) apiParams.set('search', query);
  if (category) apiParams.set('categoryId', category);
  if (inStock) apiParams.set('inStock', 'true');
  for (const key of ['minPrice', 'maxPrice'])
    if (Number(params.get(key)) > 0) apiParams.set(key, params.get(key));
  return { query, category, inStock, sort, page, path: '/produits?' + apiParams };
}

export function canRenderCatalogue(url) {
  if (url.pathname !== '/catalogue' || url.search.length > 2048) return false;
  const allowed = new Set(['search', 'category', 'instock', 'sort', 'page', 'minPrice', 'maxPrice']);
  if ([...url.searchParams.keys()].some(key => !allowed.has(key))) return false;
  const { query, category, sort, page } = catalogueQuery(url.searchParams);
  if (query.length > 255 || category.length > 150 || !Number.isSafeInteger(page) || page > 1000000 ||
      !['name-asc', 'name-desc', 'price-asc', 'price-desc'].includes(sort)) return false;
  return ['minPrice', 'maxPrice'].every(key => !url.searchParams.has(key) ||
    (Number.isFinite(Number(url.searchParams.get(key))) && Number(url.searchParams.get(key)) >= 0));
}
