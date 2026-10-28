import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { seoFamilies } from '../src/storefront/seoFamilies.js';

const output = resolve(process.argv[2] || '../output/seo-implementation/baseline');
await mkdir(output, { recursive: true });
async function publicRead(path) {
  const response = await fetch('https://newoteg.com' + path, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(`Public read ${path}: ${response.status}`);
  return response.json();
}
const categories = await publicRead('/api/categories?includeSousCategories=true');
const selected = [];
const families = [];
for (const family of seoFamilies) {
  const parent = categories.find(c => c.id === family.category);
  if (!parent?.sousCategories?.some(c => c.id === family.subcategory)) throw Error(`Family mapping changed: ${family.slug}`);
  const params = new URLSearchParams({ page: '1', limit: '24', categoryId: family.category, sousCategorieId: family.subcategory, inStock: 'true', sort: 'name_asc' });
  const response = await publicRead('/api/produits?' + params);
  families.push({ slug: family.slug, categoryId: family.category, subcategoryId: family.subcategory, availableCount: response.meta.total });
  const candidates = response.data.filter(p => p.estActif === true && Number(p.quantiteStock) > 0 && p.imageUrl);
  candidates.sort((a, b) => Number(Boolean(b.urlDatasheet)) - Number(Boolean(a.urlDatasheet)) || String(b.description || '').length - String(a.description || '').length);
  selected.push(...candidates.slice(0, 4).map(p => ({ id: p.id, name: p.nomProduit, family: family.slug, url: 'https://newoteg.com/product/' + p.id, description: p.description || '', source: p.urlDatasheet || null, reason: 'Available public stock and image; ranked by existing documentation. Demand and margin not yet available.' })));
}
const paths = ['/', '/catalogue', '/sitemap.xml', '/guides', ...selected.map(p => new URL(p.url).pathname)];
const checks = [];
for (const path of paths) {
  const response = await fetch('https://newoteg.com' + path, { signal: AbortSignal.timeout(15000) });
  const html = await response.text();
  checks.push({ path, status: response.status, title: /<title[^>]*>(.*?)<\/title>/s.exec(html)?.[1] || '', rootEmpty: /<div id="root"[^>]*>\s*<\/div>/.test(html), h1Count: (html.match(/<h1\b/g) || []).length, sitemapCount: (html.match(/<loc>/g) || []).length, robots: [...html.matchAll(/<meta[^>]*name="robots"[^>]*>/g)].map(m => m[0]) });
}
const report = { checkedAt: new Date().toISOString(), writes: 0, confidence: 'Selection based only on public catalogue; Search Console, sales, margin and customer requests not accessed.', families, products: selected, checks };
await writeFile(resolve(output, 'baseline.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, products: selected.length, families: families.length, checks: checks.length }));
