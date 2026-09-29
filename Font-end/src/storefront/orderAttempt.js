const KEY = "newoteg_order_attempt_v1";
export function newRequestId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function readAttempt() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      !value?.payload?.requestId ||
      !Array.isArray(value.payload.lignes) ||
      !["/commandes", "/commandes/checkout"].includes(value.path)
    )
      return { invalid: true };
    return value;
  } catch {
    return { invalid: true };
  }
}
export function saveAttempt(payload, path, userId) {
  const { motDePasse: _password, ...safePayload } = payload;
  const attempt = { payload: safePayload, path, userId: userId || null };
  sessionStorage.setItem(KEY, JSON.stringify(attempt));
  return attempt;
}
export function forgetAttempt() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Replay is safe if the entry remains. */
  }
}
export function sameCart(items, lines) {
  return (
    items.length === lines.length &&
    lines.every((line) =>
      items.some(
        (item) => item.id === line.produitId && item.quantity === line.quantite,
      ),
    )
  );
}
