import { formatFCFA } from './formatFCFA';

export const hasRetailPrice = product => Number(product?.retailPrice) > 0;
export const canPurchase = product => hasRetailPrice(product) && Number(product?.stock) > 0;
export const formatProductPrice = (amount, onRequest) => Number(amount) > 0 ? formatFCFA(amount) : onRequest;
export const productInquiryUrl = product => `https://wa.me/237699966160?text=${encodeURIComponent(
  `Bonjour, je souhaite connaître le prix et la disponibilité de ${product.model}. https://newoteg.com/product/${product.id}`,
)}`;
export function inquireAboutProduct(product) {
  window.open(productInquiryUrl(product), '_blank', 'noopener,noreferrer');
}
