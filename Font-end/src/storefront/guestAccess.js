const STORAGE = "newoteg_guest_tracking_v1";
const RECOVERY = "newoteg_guest_recovery_v1";
let current = "";
export function newGuestKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function rememberGuestKey(key) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(key))
    throw new Error("Invalid private access");
  current = key;
  try {
    sessionStorage.setItem(STORAGE, key);
  } catch {
    /* Memory only; the customer can keep the private link. */
  }
}
export function readGuestKey() {
  if (current) return current;
  try {
    const key = sessionStorage.getItem(STORAGE);
    return /^[A-Za-z0-9_-]{43}$/.test(key || "") ? key : "";
  } catch {
    return "";
  }
}
// Remove the secret before React or third-party auth providers can mount.
// Fragments are never sent as HTTP URLs; the API receives the key in POST bodies.
export function captureGuestFragment() {
  if (window.location.pathname !== "/suivi-invite" || !window.location.hash)
    return;
  const key = new URLSearchParams(window.location.hash.slice(1)).get("acces");
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname,
  );
  clearGuestRecovery();
  if (/^[A-Za-z0-9_-]{43}$/.test(key || "")) rememberGuestKey(key);
  else forgetGuestKey();
}
export function privateTrackingLink(key) {
  return `${window.location.origin}/suivi-invite#acces=${key}`;
}
export function forgetGuestKey() {
  current = "";
  try {
    sessionStorage.removeItem(STORAGE);
  } catch {
    /* No persistence in this browser. */
  }
  clearGuestRecovery();
}

export function saveGuestRecovery(challengeId, key) {
  sessionStorage.setItem(RECOVERY, JSON.stringify({ challengeId, key }));
  rememberGuestKey(key);
}
export function readGuestRecovery() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECOVERY));
    return /^[A-Za-z0-9_-]{43}$/.test(value?.key || "") && /^[0-9a-f-]{36}$/i.test(value?.challengeId || "") ? value : null;
  } catch { return null; }
}
export function clearGuestRecovery() {
  try { sessionStorage.removeItem(RECOVERY); } catch { /* Cleanup can fail when storage is disabled. */ }
}
