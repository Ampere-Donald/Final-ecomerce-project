import { useEffect, useRef } from "react";
import { recordObservation, watchFees } from "./journey.js";

export function useJourneyObservation(event, ready, key, lang) {
  const previous = useRef(null);
  useEffect(() => {
    if (!ready || previous.current === key) return;
    previous.current = key;
    recordObservation(event, lang);
  }, [event, ready, key, lang]);
}

export function useVisibleFees(session, ready, reception, lang) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !ready) return;
    function check() {
      const rect = node.getBoundingClientRect();
      if (
        document.visibilityState !== "visible" ||
        rect.height <= 0 ||
        rect.top < 0 ||
        rect.bottom > window.innerHeight
      )
        return;
      session.expose(reception, lang);
      watchFees(session);
    }
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(check, { threshold: 1 })
        : null;
    observer?.observe(node);
    check();
    function resume(event) {
      if (event.persisted) {
        session.resume();
        check();
      }
    }
    window.addEventListener("pageshow", resume);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      observer?.disconnect();
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [session, ready, reception, lang]);
  return ref;
}
