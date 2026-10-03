const STORAGE = "newoteg_guest_tracking_v1";
const RECOVERY = "newoteg_guest_recovery_v1";
const LINK_ATTEMPT = "newoteg_guest_link_v1";
const ACTION_ATTEMPT = "newoteg_guest_action_v1";
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
  clearGuestLink();
  clearGuestAction();
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
  clearGuestLink();
  clearGuestAction();
}

export function saveGuestRecovery(challengeId, key) {
  sessionStorage.setItem(RECOVERY, JSON.stringify({ challengeId, key }));
  rememberGuestKey(key);
}
export function readGuestRecovery() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECOVERY));
    return /^[A-Za-z0-9_-]{43}$/.test(value?.key || "") &&
      /^[0-9a-f-]{36}$/i.test(value?.challengeId || "")
      ? value
      : null;
  } catch {
    return null;
  }
}
export function clearGuestRecovery() {
  try {
    sessionStorage.removeItem(RECOVERY);
  } catch {
    /* Cleanup can fail when storage is disabled. */
  }
}

export function saveGuestLink({
  accessToken,
  challengeId,
  actionKey,
  clientId,
}) {
  // Store only exact retry capabilities, never an OTP or account credentials.
  const serialized = JSON.stringify({
    accessToken,
    challengeId,
    actionKey,
    clientId,
  });
  sessionStorage.setItem(LINK_ATTEMPT, serialized);
  if (sessionStorage.getItem(LINK_ATTEMPT) !== serialized)
    throw new Error("Unable to retain linking attempt");
}
export function readGuestLink() {
  try {
    const value = JSON.parse(sessionStorage.getItem(LINK_ATTEMPT));
    return /^[A-Za-z0-9_-]{43}$/.test(value?.accessToken || "") &&
      /^[A-Za-z0-9_-]{43}$/.test(value?.actionKey || "") &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value?.challengeId || "",
      ) &&
      typeof value.clientId === "string" &&
      value.clientId
      ? value
      : null;
  } catch {
    return null;
  }
}
export function clearGuestLink() {
  try {
    sessionStorage.removeItem(LINK_ATTEMPT);
  } catch {
    /* No persistent attempt in this browser. */
  }
}

export function saveGuestAction({
  accessToken,
  challengeId,
  actionKey,
  action,
  orderId,
}) {
  const serialized = JSON.stringify({
    accessToken,
    challengeId,
    actionKey,
    action,
    orderId,
  });
  sessionStorage.setItem(ACTION_ATTEMPT, serialized);
  if (sessionStorage.getItem(ACTION_ATTEMPT) !== serialized)
    throw new Error("Unable to retain order action");
}
export function readGuestAction() {
  try {
    const value = JSON.parse(sessionStorage.getItem(ACTION_ATTEMPT));
    return /^[A-Za-z0-9_-]{43}$/.test(value?.accessToken || "") &&
      /^[A-Za-z0-9_-]{43}$/.test(value?.actionKey || "") &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value?.challengeId || "",
      ) &&
      ["CANCEL", "RECEIVE"].includes(value?.action) &&
      typeof value.orderId === "string" &&
      value.orderId
      ? value
      : null;
  } catch {
    return null;
  }
}
export function clearGuestAction() {
  try {
    sessionStorage.removeItem(ACTION_ATTEMPT);
  } catch {
    /* No durable attempt in this browser. */
  }
}
