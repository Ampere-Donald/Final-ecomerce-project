/**
 * Shared product mapping utility.
 *
 * Transforms a raw API product object (from GET /api/produits)
 * into the storefront shape used by catalogue cards, detail pages,
 * and featured products.  Having a single source of truth avoids
 * future mismatches between pages.
 */

export const API_BASE = 'http://localhost:3000';

export const PLACEHOLDER_IMG =
    'https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop';

/**
 * Generate the short product code from a UUID.
 * Takes the first segment of the UUID and upper-cases it.
 *
 * @param {string} uuid  – full product UUID
 * @returns {string}     – e.g. "AD5DC5B8"
 */
export function getProductCode(uuid) {
    return uuid.split('-')[0].toUpperCase();
}

/**
 * Map a raw backend product to the storefront product shape.
 *
 * @param {Object} p  – raw product from the API
 * @returns {Object}  – storefront product
 */
export function mapProduct(p) {
    return {
        id: p.id,
        model: p.nomProduit,
        code: getProductCode(p.id),
        brand: p.marque,
        description: p.description,
        categoryName: p.categorie?.nom || 'DIVERS',
        categoryId: p.categorie?.id || '',
        categorySlug: p.categorie?.id || 'divers',
        retailPrice: parseFloat(p.prixDetail) || 0,
        wholesalePrice: parseFloat(p.prixGros) || 0,
        stock: p.quantiteStock ?? 0,
        oldPrice: null,
        parentCategory: 'ÉQUIPEMENTS',
        image: p.imageUrl
            ? `${API_BASE}${p.imageUrl}`
            : PLACEHOLDER_IMG,
    };
}
