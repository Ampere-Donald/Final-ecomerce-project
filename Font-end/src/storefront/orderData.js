export function apiMessage(error, fallback) {
  const message = error?.response?.data?.message;
  return Array.isArray(message)
    ? message.join(" ")
    : typeof message === "string"
      ? message
      : fallback;
}
export function safeReturnTo(value) {
  return typeof value === "string" &&
    /^\/(?!\/)/.test(value) &&
    !/[\\\r\n]/.test(value)
    ? value
    : "/profile";
}
export function validQuote(quote, items) {
  if (
    !quote ||
    !Array.isArray(quote.lignes) ||
    quote.lignes.length !== items.length ||
    !Number.isFinite(quote.montantArticles) ||
    quote.montantArticles <= 0
  )
    return false;
  const ids = new Set();
  let total = 0;
  for (const line of quote.lignes) {
    const item = items.find((i) => i.id === line.produitId);
    if (
      !item ||
      ids.has(line.produitId) ||
      item.quantity !== line.quantite ||
      !Number.isFinite(line.prixUnitaire) ||
      line.prixUnitaire <= 0 ||
      !line.nomProduit
    )
      return false;
    ids.add(line.produitId);
    total += Math.round(line.prixUnitaire * 100) * line.quantite;
  }
  return total / 100 === quote.montantArticles;
}
export const orderStates = {
  EN_ATTENTE: ["En attente de validation", "Awaiting confirmation", "pending"],
  CONFIRMEE: ["Confirmée", "Confirmed", "confirmed"],
  EN_LIVRAISON: ["En livraison", "In transit", "confirmed"],
  LIVREE: ["Réception terminée", "Received", "done"],
  ANNULEE: ["Annulée", "Cancelled", "cancelled"],
};
export function orderState(status, lang = "fr") {
  const entry = orderStates[status];
  return {
    label: entry
      ? entry[lang === "en" ? 1 : 0]
      : lang === "en"
        ? "Status to confirm"
        : "Statut à confirmer",
    tone: entry?.[2] || "pending",
  };
}
export function orderDate(value, lang = "fr") {
  if (!value || !Number.isFinite(Date.parse(value)))
    return lang === "en" ? "Date unavailable" : "Date non renseignée";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(new Date(value));
}
