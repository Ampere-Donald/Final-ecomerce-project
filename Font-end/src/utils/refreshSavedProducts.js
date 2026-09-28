import apiClient from './apiClient';
import { mapProduct } from './mapProduct';

// Old browser caches must not redisplay archived products or superseded pictures.
export async function refreshSavedProducts(storageKey, cart = false) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { saved = []; }
    if (!Array.isArray(saved)) return { products: [], complete: true };
    const products = [];
    let complete = true;
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(4, saved.length) }, async () => {
        while (index < saved.length) {
            const item = saved[index++];
            if (!item?.id) continue;
            try {
                const response = await apiClient.get(`/produits/${encodeURIComponent(item.id)}`);
                if (!response.data.estActif) continue;
                const product = mapProduct(response.data);
                if (cart && (!(product.retailPrice > 0) || !(product.stock > 0))) continue;
                products.push({ ...product, ...(cart ? {
                    quantity: Math.min(Math.max(1, Number(item.quantity) || 1), product.stock),
                } : {}) });
            } catch (error) {
                if (error.response?.status !== 404) complete = false;
            }
        }
    }));
    return { products, complete };
}
