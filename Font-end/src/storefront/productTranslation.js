import { productEnglishTranslations } from './productEnglish.generated.js';

// The commercial record may change independently. Reuse a translation only
// while the exact identity reviewed in French still describes this product.
export function getProductTranslation(product, translations = productEnglishTranslations) {
  const entry=translations.find(entry=>entry.id===product.id);
  if(!entry || !entry.en || !entry.expected || product.attributeCount || product.technicalAttributes?.length || product.attributes?.length) return null;
  if(['model','image','description','brand','urlDatasheet'].some(key=>(product[key]||'')!==(entry.expected[key]||''))) return null;
  return entry;
}
export function productText(product, lang='fr') {
  const copy=lang==='en' ? getProductTranslation(product)?.en : null;
  return { name:copy?.name || (lang==='en' && product.englishName ? product.englishName : product.model),
    description:copy?.description || product.description || '' };
}

// Public API / sitemap identity, without importing browser API clients. The
// reviewed pilot uses absolute image URLs; a changed media address withdraws it.
export function getRawProductTranslation(raw) {
  if (!raw) return null;
  return getProductTranslation({ id: raw.id, model: raw.nomProduit, image: raw.imageUrl,
    description: raw.description, brand: raw.marque,
    urlDatasheet: /^https?:\/\//i.test(raw.urlDatasheet || '') ? raw.urlDatasheet : null,
    attributes: raw.attributs || [] });
}
