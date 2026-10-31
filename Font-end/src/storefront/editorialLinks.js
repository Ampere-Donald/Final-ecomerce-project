import { editorialIndex } from './editorialIndex.generated.js';
import { englishGuideIndex } from './englishRoutes.generated.js';
import { seoFamilies } from './seoFamilies.js';

// Navigation reads only the selected, generated index. No draft or guide body
// is imported by home, product or catalogue navigation.
export const selectionGuides = (lang = 'fr') => (lang === 'en' ? englishGuideIndex : editorialIndex)
  .filter(entry => entry.type === 'guide');

export function productGuides(product, lang = 'fr') {
  const family = seoFamilies.find(entry => entry.category === product.categoryId && entry.subcategory === product.subcategoryId);
  return selectionGuides(lang).filter(entry => entry.productIds?.includes(product.id) ||
    (family && entry.families.includes(family.slug)));
}
