import { useSyncExternalStore } from "react";
import {
  COMPARISON_KEY,
  EMPTY_COMPARISON,
  parseComparison,
  toggleComparison,
} from "./comparisonData";

const emptySnapshot = { selection: EMPTY_COMPARISON, saved: true };
let snapshot;
const listeners = new Set();
function read() {
  try {
    return {
      selection: parseComparison(localStorage.getItem(COMPARISON_KEY)),
      saved: true,
    };
  } catch {
    return { selection: EMPTY_COMPARISON, saved: false };
  }
}
const current = () => snapshot || (snapshot = read());
function subscribe(listener) {
  listeners.add(listener);
  const storage = (event) => {
    if (event.key === COMPARISON_KEY || event.key === null) {
      snapshot = read();
      listeners.forEach((notify) => notify());
    }
  };
  window.addEventListener("storage", storage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", storage);
  };
}
function save(selection) {
  let saved = true;
  try {
    if (!selection.ids.length) localStorage.removeItem(COMPARISON_KEY);
    else
      localStorage.setItem(
        COMPARISON_KEY,
        JSON.stringify({ schema: 1, ...selection }),
      );
  } catch {
    saved = false;
  }
  snapshot = { selection, saved };
  listeners.forEach((notify) => notify());
}
export function toggleSelectedProduct(product) {
  const result = toggleComparison(current().selection, product);
  if (!result.error) save(result.selection);
  return result.error;
}
export function removeComparedProduct(id) {
  const previous = current().selection;
  const ids = previous.ids.filter((value) => value !== id);
  save(ids.length ? { ...previous, ids } : EMPTY_COMPARISON);
}
export function clearComparison() {
  save(EMPTY_COMPARISON);
}
export default function useComparison() {
  return useSyncExternalStore(subscribe, current, () => emptySnapshot);
}
