const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREFIX = "newoteg_review_v1:";
export function reviewContent(value) {
  const texte = value?.texte?.trim(),
    pseudonyme = value?.pseudonyme?.trim(),
    projetRealise = value?.projetRealise?.trim() || "";
  if (
    !Number.isInteger(value?.note) ||
    value.note < 1 ||
    value.note > 5 ||
    typeof texte !== "string" ||
    texte.length < 10 ||
    texte.length > 2000 ||
    typeof pseudonyme !== "string" ||
    pseudonyme.length < 2 ||
    pseudonyme.length > 40 ||
    projetRealise.length > 300
  )
    throw Error("Invalid review content");
  if (
    [texte, pseudonyme, projetRealise].some((text) =>
      [...text].some((char) => {
        const code = char.charCodeAt(0);
        return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
      }),
    )
  )
    throw Error("Invalid review text");
  return { note: value.note, texte, pseudonyme, projetRealise };
}
export function reviewReceipt(value) {
  return UUID.test(value?.id || "") && value?.enregistre === true;
}
export function reviewList(value, page) {
  if (
    !Number.isInteger(value?.total) ||
    value.total < 0 ||
    value.page !== page ||
    value.limit !== 10 ||
    !Array.isArray(value.items) ||
    value.items.length > Math.min(10, value.total) ||
    (value.total === 0
      ? value.moyenne !== null
      : !Number.isFinite(value.moyenne) ||
        value.moyenne < 1 ||
        value.moyenne > 5)
  )
    throw Error("Invalid review list");
  const seen = new Set();
  value.items.forEach((item) => {
    reviewContent(item);
    if (
      !UUID.test(item.id) ||
      seen.has(item.id) ||
      item.achatVerifie !== true ||
      !Number.isFinite(Date.parse(item.createdAt)) ||
      (item.reponseBoutique !== null &&
        (typeof item.reponseBoutique !== "string" ||
          item.reponseBoutique.length > 1000))
    )
      throw Error("Invalid review");
    seen.add(item.id);
  });
  return value;
}
function storageKey(scope) {
  return PREFIX + scope;
}
function attemptValid(value, scope) {
  if (
    !value ||
    value.scope !== scope ||
    !UUID.test(value.orderId || "") ||
    !UUID.test(value.body?.requestId || "") ||
    !UUID.test(value.body?.ligneCommandeId || "") ||
    !["account", "guest"].includes(value.mode)
  )
    throw Error("Invalid saved review");
  reviewContent(value.body);
  if (
    value.mode === "guest" &&
    (!/^[A-Za-z0-9_-]{43}$/.test(value.accessToken || "") ||
      !/^[A-Za-z0-9_-]{43}$/.test(value.actionKey || "") ||
      (value.challengeId && !UUID.test(value.challengeId)))
  )
    throw Error("Invalid saved consent");
  return value;
}
export function readReviewAttempt(scope, storage = sessionStorage) {
  const raw = storage.getItem(storageKey(scope));
  return raw ? attemptValid(JSON.parse(raw), scope) : null;
}
export function saveReviewAttempt(value, storage = sessionStorage) {
  attemptValid(value, value.scope);
  const raw = JSON.stringify(value);
  storage.setItem(storageKey(value.scope), raw);
  if (storage.getItem(storageKey(value.scope)) !== raw)
    throw Error("Review attempt was not retained");
  return value;
}
export function clearReviewAttempt(scope, storage = sessionStorage) {
  storage.removeItem(storageKey(scope));
}
export function clearReviewAttempts(mode, storage = sessionStorage) {
  try {
    const keys = Array.from({ length: storage.length }, (_, i) =>
      storage.key(i),
    ).filter((key) => key?.startsWith(PREFIX + mode + ":"));
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    /* A denied store cannot be read by this session either. */
  }
}
export function guestReviewOrder(accessToken, storage = sessionStorage) {
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(PREFIX + "guest:")) continue;
    const attempt = readReviewAttempt(key.slice(PREFIX.length), storage);
    if (attempt?.accessToken === accessToken) return attempt.orderId;
  }
  return null;
}
