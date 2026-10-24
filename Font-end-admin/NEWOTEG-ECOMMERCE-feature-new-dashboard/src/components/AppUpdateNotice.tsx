import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

/** Keep the current worker while a sale/form is open. The user chooses when to reload. */
export function AppUpdateNotice() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(false);
  const [apply, setApply] = useState<(() => Promise<void>) | null>(null);
  useEffect(() => {
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let lastCheck = 0;
    const check = () => {
      if (document.hidden || !navigator.onLine || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      void registration?.update().catch(() => {});
    };
    const update = registerSW({
      immediate: true,
      onNeedRefresh() { if (active) setAvailable(true); },
      onRegisteredSW(_url, value) { registration = value; check(); },
    });
    setApply(() => () => update(true));
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    const interval = window.setInterval(check, 30 * 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  if (!available || dismissed) return null;
  return (
    <aside role="status" aria-label="Mise à jour de l’application" className="workspace-update fixed inset-x-3 z-[55] mx-auto max-w-lg rounded-2xl border border-indigo-200 bg-white p-4 shadow-xl">
      <p className="text-sm font-semibold text-slate-900">Une nouvelle version est disponible</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">Terminez et enregistrez vos saisies avant d’actualiser.</p>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">Mise à jour impossible. Vérifiez la connexion puis réessayez.</p>}
      <button className="admin-button-primary mt-3 w-full" disabled={updating} onClick={async () => {
        setUpdating(true); setError(false);
        try {
          await apply?.();
          // No reload can occur if the worker disappeared while the app was suspended.
          window.setTimeout(() => { setError(true); setUpdating(false); }, 10_000);
        } catch { setError(true); setUpdating(false); }
      }}><RefreshCw size={16} className={updating ? 'animate-spin' : ''} />{updating ? 'Actualisation…' : 'Actualiser l’application'}</button>
      <button type="button" className="mt-1 min-h-11 w-full text-sm font-medium text-slate-600" disabled={updating} onClick={() => setDismissed(true)}>Plus tard</button>
    </aside>
  );
}
