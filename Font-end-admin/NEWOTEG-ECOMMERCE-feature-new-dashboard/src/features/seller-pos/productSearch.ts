export interface SearchableSellerProduct {
  id: string;
  nomProduit: string;
  designationEn?: string | null;
  marque?: string | null;
  codeFamille?: string | null;
  code?: string | null;
  quantiteStock?: number | null;
  quantiteDisponibleVente?: number | null;
  categorie?: { id?: string; nom?: string } | null;
  categorieNom?: string | null;
}

export const normalizeProductSearch = (value?: string | null): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const searchableText = (product: SearchableSellerProduct): string =>
  normalizeProductSearch([
    product.nomProduit,
    product.designationEn,
    product.marque,
    product.codeFamille,
    product.code,
    product.categorie?.nom,
    product.categorieNom,
  ].filter(Boolean).join(' '));

const boundedEditDistance = (first: string, second: string, maximum: number): number => {
  if (Math.abs(first.length - second.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex];
    let rowMinimum = current[0];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + substitutionCost,
      );
      rowMinimum = Math.min(rowMinimum, current[secondIndex]);
    }
    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }

  return previous[second.length];
};

const closeWordScore = (term: string, words: string[]): number => {
  if (words.some(word => word === term)) return 130;
  if (words.some(word => word.startsWith(term))) return 105;
  if (words.some(word => word.includes(term))) return 92;
  if (term.length >= 4 && words.some(word => term.startsWith(word) && word.length >= 4)) return 82;
  if (term.length < 4 || /\d/.test(term)) return 0;

  const maximumDistance = term.length >= 8 ? 2 : 1;
  let closestDistance = maximumDistance + 1;
  for (const word of words) {
    if (word.length < 4 || /\d/.test(word)) continue;
    closestDistance = Math.min(closestDistance, boundedEditDistance(term, word, maximumDistance));
  }
  if (closestDistance > maximumDistance) return 0;
  return closestDistance === 1 ? 72 : 48;
};

const productWords = (product: SearchableSellerProduct): string[] =>
  searchableText(product).split(' ').filter(Boolean);

export const isFuzzySellerProductMatch = (
  product: SearchableSellerProduct,
  rawQuery: string,
): boolean => {
  const terms = normalizeProductSearch(rawQuery).split(' ').filter(Boolean);
  if (!terms.length) return false;
  const haystack = searchableText(product);
  return terms.some(term => !haystack.includes(term)) && sellerProductSearchScore(product, rawQuery) > 0;
};

export const sellerProductSearchScore = (
  product: SearchableSellerProduct,
  rawQuery: string,
): number => {
  const query = normalizeProductSearch(rawQuery);
  if (!query) return 1;

  const terms = query.split(' ').filter(Boolean);
  const name = normalizeProductSearch(product.nomProduit);
  const englishName = normalizeProductSearch(product.designationEn);
  const brand = normalizeProductSearch(product.marque);
  const code = normalizeProductSearch(product.code);
  const family = normalizeProductSearch(product.codeFamille);
  const words = productWords(product);
  const termScores = terms.map(term => closeWordScore(term, words));
  if (termScores.some(score => score === 0)) return 0;

  let score = 100 + termScores.reduce((total, termScore) => total + termScore, 0);
  if (code === query) score += 1_200;
  else if (code.startsWith(query)) score += 850;
  else if (code.includes(query)) score += 650;
  if (`${family} ${code}`.trim() === query) score += 1_000;
  if (name === query) score += 950;
  else if (name.startsWith(query)) score += 720;
  else if (name.includes(query)) score += 480;
  if (englishName.startsWith(query)) score += 360;
  if (brand === query) score += 260;
  else if (brand.startsWith(query)) score += 180;

  for (const term of terms) {
    if (name.split(' ').some(word => word.startsWith(term))) score += 70;
    if (code.startsWith(term) || family.startsWith(term)) score += 90;
  }

  const available = Number(product.quantiteDisponibleVente ?? product.quantiteStock ?? 0);
  if (available > 0) score += 35;
  return score;
};

export const rankSellerProducts = <T extends SearchableSellerProduct>(
  products: T[],
  query: string,
  limit = 30,
): T[] => {
  const normalized = normalizeProductSearch(query);
  if (!normalized) return products.slice(0, limit);

  return products
    .map(product => ({ product, score: sellerProductSearchScore(product, normalized) }))
    .filter(item => item.score > 0)
    .sort((first, second) => (
      second.score - first.score || first.product.nomProduit.localeCompare(second.product.nomProduit, 'fr')
    ))
    .slice(0, limit)
    .map(item => item.product);
};

export const mergeSellerProductIndex = <T extends { id: string }>(
  current: T[],
  incoming: T[],
  maxSize = 300,
): T[] => {
  const byId = new Map(current.map(product => [product.id, product]));
  incoming.forEach(product => byId.set(product.id, product));
  return Array.from(byId.values()).slice(-maxSize);
};
