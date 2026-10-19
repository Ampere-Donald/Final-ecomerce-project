import { cardImage } from './cardImage.js';
import { productImageUrl, productMediaBase } from '../utils/productImageUrl.js';

// Match the first catalogue card's existing URL and responsive sizes. Never
// prefetch arbitrary third-party images or gallery originals.
export function catalogueLeadImage(data, apiBase = '/api') {
  const rows = Array.isArray(data) ? data : data && data.data;
  const image = Array.isArray(rows) && rows[0] && rows[0].imageUrl;
  const responsive = cardImage(image);
  if (responsive) return responsive;
  if (typeof image === 'string' && /^\/product-images\/[\w.-]+\.webp$/.test(image))
    return { src: productImageUrl(image, productMediaBase(apiBase)) };
  return null;
}
