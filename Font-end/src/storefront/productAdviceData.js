import { shopContact } from "./shopContact.js";
export function adviceMessage(product, quantity, lang, origin) {
  const en = lang === "en";
  const url = new URL("/product/" + encodeURIComponent(product.id), origin)
    .href;
  const count = Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
  return [
    en
      ? "Hello X-Electronic, I’d like advice about this part."
      : "Bonjour X-Electronic, je souhaite un conseil sur cette pièce.",
    (en ? "Product: " : "Produit : ") +
      (en && product.englishName ? product.englishName : product.model),
    product.reference
      ? (en ? "Reference: " : "Référence : ") + product.reference
      : null,
    (en ? "Requested quantity: " : "Quantité souhaitée : ") + count,
    url,
    "",
    en
      ? "Could you help me confirm compatibility for my project?"
      : "Pouvez-vous m’aider à vérifier la compatibilité avec mon projet ?",
  ]
    .filter((line) => line !== null)
    .join("\n");
}
export function adviceHref(message) {
  const text = typeof message === "string" ? message.trim() : "";
  return text && text.length <= 1800
    ? shopContact.whatsapp + "?text=" + encodeURIComponent(text)
    : null;
}
