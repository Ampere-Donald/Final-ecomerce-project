export const RECEPTION_KEY = "newoteg_reception_v1";
export const DEFAULT_RECEPTION = Object.freeze({
  mode: "RETRAIT_MAGASIN",
  ville: "",
});
export function normalizeReception(value) {
  if (!value || !["RETRAIT_MAGASIN", "LIVRAISON"].includes(value.mode))
    return DEFAULT_RECEPTION;
  const ville =
    typeof value.ville === "string" ? value.ville.trim().normalize("NFC") : "";
  if (
    ville.length > 80 ||
    Array.from(ville).some(
      (char) => char.codePointAt(0) < 32 || char.codePointAt(0) === 127,
    )
  )
    return DEFAULT_RECEPTION;
  return { mode: value.mode, ville: value.mode === "LIVRAISON" ? ville : "" };
}
export function readReception(storage) {
  try {
    const raw = (storage || globalThis.localStorage)?.getItem(RECEPTION_KEY);
    if (!raw) return DEFAULT_RECEPTION;
    const value = JSON.parse(raw);
    return value.schema === 1 ? normalizeReception(value) : DEFAULT_RECEPTION;
  } catch {
    return DEFAULT_RECEPTION;
  }
}
export function persistReception(value, storage) {
  const reception = normalizeReception(value);
  try {
    (storage || globalThis.localStorage).setItem(
      RECEPTION_KEY,
      JSON.stringify({ schema: 1, ...reception }),
    );
    return { reception, saved: true };
  } catch {
    return { reception, saved: false };
  }
}
