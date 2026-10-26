// Drafts are isolated by account and never replayed automatically.
const prefix = "newoteg:catalogue-draft:v1:";
export function draftKey(user: string, product: string) {
  return `${prefix}${user}:${product}`;
}
export function readDraft<T>(user: string, product: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(draftKey(user, product)) || "null");
  } catch {
    return null;
  }
}
export function saveDraft(
  user: string,
  product: string,
  value: unknown,
): boolean {
  try {
    localStorage.setItem(draftKey(user, product), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function removeDraft(user: string, product: string) {
  try {
    localStorage.removeItem(draftKey(user, product));
  } catch {
    /* storage is unavailable */
  }
}
