import { useEffect, useState } from "react";
// Refresh offer visibility at the first server deadline, without polling.
export default function useOfferClock(data) {
  const [now, setNow] = useState(() => Date.now());
  const deadline = Math.min(...(Array.isArray(data) ? data : []).map(p => Date.parse(p.offre?.fin)).filter(t => Number.isFinite(t) && t > now));
  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(deadline - Date.now() + 1, 1), 2147483647));
    return () => clearTimeout(timer);
  }, [deadline, now]);
  return now;
}
