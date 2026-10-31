import { productEnglishTranslations } from './productEnglish.generated.js';

// The commercial record may change independently. Reuse a translation only
// while the exact identity reviewed in French still describes this product.
export function getProductTranslation(product, translations = productEnglishTranslations) {
  const entry=translations.find(entry=>entry.id===product.id);
  if(!entry || !entry.en || !entry.expected || product.technicalAttributes?.length || product.attributes?.length) return null;
  if(['model','image','description','brand','urlDatasheet'].some(key=>(product[key]||'')!==(entry.expected[key]||''))) return null;
  return entry;
}
export function productText(product, lang='fr') {
  const copy=lang==='en' ? getProductTranslation(product)?.en : null;
  return { name:copy?.name || (lang==='en' && product.englishName ? product.englishName : product.model),
    description:copy?.description || product.description || '' };
}
