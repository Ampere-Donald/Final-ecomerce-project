import { startTransition, useEffect, useState } from 'react';
import { MotionContext } from './motionPreferences';

const storageKey = 'newoteg.motion-paused';
export default function MotionProvider({ children }) {
  // Same markup on the server and first hydration; autoplay waits for preference.
  const [preferences, setPreferences] = useState({ ready: false, reduced: true, paused: false });
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    function update() {
      let paused = false;
      try { paused = localStorage.getItem(storageKey) === 'true'; } catch { /* Session still works. */ }
      // Let pending Suspense boundaries hydrate their existing HTML before a
      // preference update changes shared context. CSS honors the system now.
      startTransition(() => setPreferences({ ready: true, reduced: media.matches, paused }));
    }
    update();
    if (media.addEventListener) media.addEventListener('change', update); else media.addListener(update);
    const storage = event => { if (event.key === storageKey || event.key === null) update(); };
    window.addEventListener('storage', storage);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update); else media.removeListener(update);
      window.removeEventListener('storage', storage);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = !preferences.ready || preferences.reduced || preferences.paused ? 'reduced' : 'full';
    return () => { delete document.documentElement.dataset.motion; };
  }, [preferences]);
  function toggle() {
    const paused = !preferences.paused;
    try { localStorage.setItem(storageKey, String(paused)); } catch { /* No storage required. */ }
    setPreferences(previous => ({ ...previous, paused }));
  }
  return <MotionContext.Provider value={{ ...preferences, toggle }}>{children}</MotionContext.Provider>;
}
