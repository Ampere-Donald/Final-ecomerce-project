import { apiMessage } from "./orderData.js";

// Stable server codes keep the same action/error meaning in either language.
// Unknown errors retain the existing API/fallback behavior.
const messages = {
  GUEST_ACCESS_UNAVAILABLE: [
    "Accès indisponible ou expiré. Contactez la boutique pour récupérer votre suivi.",
    "Access is unavailable or expired. Contact the shop to recover your tracking.",
  ],
  GUEST_ACTION_CODE_REQUIRED: [
    "Saisissez le code reçu par email pour cette action.",
    "Enter the email code for this action.",
  ],
  GUEST_ACTION_INVALID: [
    "Code ou accès invalide, expiré ou déjà utilisé. Vérifiez le code ou demandez-en un nouveau.",
    "The code or access is invalid, expired or already used. Check the code or request a new one.",
  ],
  GUEST_ORDER_CHANGED: [
    "La commande ou l’accès a changé. Actualisez le suivi et demandez un nouveau code.",
    "The order or access has changed. Refresh tracking and request a new code.",
  ],
  GUEST_ACTION_UNAVAILABLE: [
    "Cette action n’est pas disponible pour le statut et le mode de réception actuels.",
    "This action is unavailable for the current order status and reception method.",
  ],
  GUEST_EMAIL_MISSING: [
    "Aucun email n’a été enregistré lors de la commande. Contactez la boutique.",
    "No email was recorded at checkout. Contact the shop.",
  ],
};

export function guestApiMessage(error, lang, fallback) {
  if (error?.response?.status === 429)
    return lang === "en"
      ? "Wait before requesting a new code."
      : "Attendez avant de demander un nouveau code.";
  const code = error?.response?.data?.code;
  return Object.hasOwn(messages, code)
    ? messages[code][lang === "en" ? 1 : 0]
    : apiMessage(error, fallback);
}
