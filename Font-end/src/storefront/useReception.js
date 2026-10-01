import { useSyncExternalStore } from "react";
import {
  DEFAULT_RECEPTION,
  readReception,
  persistReception,
  RECEPTION_KEY,
} from "./receptionData";
let snapshot;
const listeners = new Set();
export const getReceptionSnapshot = () =>
  snapshot || (snapshot = readReception());
function subscribe(listener) {
  listeners.add(listener);
  const changed = (event) => {
    if (event.key === RECEPTION_KEY || event.key === null) {
      snapshot = readReception();
      listeners.forEach((notify) => notify());
    }
  };
  window.addEventListener("storage", changed);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", changed);
  };
}
export function setReception(value) {
  const previous = getReceptionSnapshot();
  const result = persistReception(value);
  if (
    previous.mode !== result.reception.mode ||
    previous.ville !== result.reception.ville
  ) {
    snapshot = result.reception;
    listeners.forEach((notify) => notify());
  }
  return result.saved;
}
export default function useReception() {
  return useSyncExternalStore(
    subscribe,
    getReceptionSnapshot,
    () => DEFAULT_RECEPTION,
  );
}
