import { stockState } from './productData.js';
import { seoFamilies, familyPath } from './seoFamilies.js';
import { catalogueBootJSON } from './initialCatalogue.js';
import { productText } from './productTranslation.js';

const origin = 'https://newoteg.com';
function publicImage(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, origin);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function productSchema(product, lang = 'fr') {
  const url = origin + '/product/' + encodeURIComponent(product.id);
  const { name, description } = productText(product, lang);
  const image = [...new Set((product.images || []).map(publicImage).filter(Boolean))];
  const item = { '@type': 'Product', '@id': url + '#product', url, name,
    ...(description ? { description } : {}),
    ...(image.length ? { image } : {}),
    ...(product.reference ? { sku: product.reference } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
  };
  // Unknown price or stock is not a fabricated offer. An unavailable product
  // may keep its genuine displayed price and explicitly be OutOfStock.
  const stock = stockState(product);
  if (Number.isFinite(product.retailPrice) && product.retailPrice > 0 && stock !== 'unknown') {
    item.offers = { '@type': 'Offer', url, priceCurrency: 'XAF', price: product.retailPrice,
      availability: 'https://schema.org/' + (stock === 'out' ? 'OutOfStock' : 'InStock'),
      seller: { '@type': 'Organization', name: 'NEWOTEG / X-Electronic', url: origin },
      ...(product.offer?.end ? { priceValidUntil: product.offer.end } : {}),
    };
  }
  const family = seoFamilies.find(f => f.category === product.categoryId && f.subcategory === product.subcategoryId);
  const items = [{ name: lang === 'en' ? 'Home' : 'Accueil', item: origin + '/' },
    { name: 'Catalogue', item: origin + '/catalogue' },
    ...(family ? [{ name: lang === 'en' ? family.en : family.fr, item: origin + familyPath(family) }] : []),
    { name, item: url }];
  return { '@context': 'https://schema.org', '@graph': [item,
    { '@type': 'BreadcrumbList', itemListElement: items.map((entry, i) => ({ '@type': 'ListItem', position: i + 1, ...entry })) }] };
}

export const productSchemaJSON = (product, lang) => catalogueBootJSON(productSchema(product, lang));
