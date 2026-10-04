import {
  createFeeObservation,
  createJourneyCollector,
  observation,
} from "./journeyData.js";
import { newRequestId } from "./orderAttempt.js";

const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const base = (raw.endsWith("/api") ? raw : `${raw}/api`) + "/parcours";
async function request(path, payload, keepalive = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    // Separate from axios: no account Authorization, cookies or referring URL.
    return await fetch(base + path, {
      method: payload ? "POST" : "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      keepalive,
      ...(payload
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        : {}),
    });
  } finally {
    clearTimeout(timeout);
  }
}
const collector = createJourneyCollector({
  capability: async () => {
    const response = await request("/disponibilite");
    return response.ok && (await response.json()).actif === true;
  },
  send: async (payload, keepalive) => {
    const response = await request("/evenements", payload, keepalive);
    if (response.status >= 500)
      throw new Error("Unavailable observation collector");
    // A malformed/throttled event is dropped, never queued indefinitely.
    if (!response.ok) return "discard";
    return (await response.json()).actif === false ? "disabled" : "accepted";
  },
  schedule: (f, delay) => setTimeout(f, delay),
  cancel: clearTimeout,
});
export function prepareObservation(event, lang, reception = "GENERAL") {
  return observation(event, {
    lang,
    reception,
    width: window.innerWidth,
    now: new Date(),
    // Fresh observation ID, independently generated; no order receipt reused.
    uuid: newRequestId,
  });
}
export function recordPreparedObservation(value) {
  collector.push(value);
}
export function recordObservation(
  event,
  lang = document.documentElement.lang,
  reception = "GENERAL",
) {
  collector.push(prepareObservation(event, lang, reception));
}
let fees;
export function newFeeObservation() {
  return createFeeObservation(recordObservation);
}
export function watchFees(session) {
  fees = session;
}
export function leaveCheckout() {
  fees?.leave();
  fees = null;
}
export function startJourney() {
  void collector.start();
}

// Browser departure is not a React effect cleanup (including StrictMode).
window.addEventListener("pagehide", () => {
  leaveCheckout();
  void collector.flush(true);
});
