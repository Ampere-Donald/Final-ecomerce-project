import { describe, expect, it } from 'vitest';
import { isFuzzySellerProductMatch, mergeSellerProductIndex, rankSellerProducts } from './productSearch';

const products = [
  { id: '1', nomProduit: 'Fer à souder 40W original', marque: 'Proskit', codeFamille: '106', code: '00042', quantiteStock: 4 },
  { id: '2', nomProduit: 'Support pour fer à souder', marque: 'Generic', codeFamille: '106', code: '00043', quantiteStock: 9 },
  { id: '3', nomProduit: 'Condensateur 40V', marque: 'Rubycon', codeFamille: '210', code: '00980', quantiteStock: 12 },
];

describe('recherche express vendeur', () => {
  it('retrouve un produit avec plusieurs mots sans dépendre des accents', () => {
    expect(rankSellerProducts(products, 'fer souder 40w').map(product => product.id)).toEqual(['1']);
  });

  it('place une correspondance exacte de code avant une correspondance de nom', () => {
    expect(rankSellerProducts(products, '00042')[0]?.id).toBe('1');
  });

  it('suggere un nom proche malgre une faute de frappe', () => {
    expect(rankSellerProducts(products, 'fer soudr').map(product => product.id)).toEqual(['1', '2']);
    expect(rankSellerProducts(products, 'condansateur')[0]?.id).toBe('3');
    expect(isFuzzySellerProductMatch(products[2], 'condansateur')).toBe(true);
  });

  it('ne rend jamais un code numerique approximatif', () => {
    expect(rankSellerProducts(products, '00041')).toEqual([]);
  });

  it('conserve un index borné et remplace les anciennes données du même produit', () => {
    const merged = mergeSellerProductIndex(products.slice(0, 2), [
      { ...products[0], quantiteStock: 2 },
      products[2],
    ], 3);
    expect(merged).toHaveLength(3);
    expect(merged.find(product => product.id === '1')?.quantiteStock).toBe(2);
  });
});
