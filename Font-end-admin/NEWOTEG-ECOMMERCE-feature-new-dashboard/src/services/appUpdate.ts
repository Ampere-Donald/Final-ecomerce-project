/** Reload only after activation: clientsClaim=false preserves open pages. */
export async function activateAppUpdate(
  registration: Pick<ServiceWorkerRegistration, 'waiting' | 'active'> | undefined,
  reload: () => void,
): Promise<void> {
  if (!registration) throw new Error('Aucune mise à jour enregistrée.');
  const worker = registration.waiting;
  if (worker) {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.removeEventListener('statechange', changed);
        if (error) reject(error); else resolve();
      };
      const changed = () => {
        if (worker.state === 'activated') finish();
        if (worker.state === 'redundant') finish(new Error('La mise à jour a été interrompue.'));
      };
      const timeout = setTimeout(() => finish(new Error('La mise à jour ne répond pas.')), 25000);
      worker.addEventListener('statechange', changed);
      changed();
      if (!settled) {
        try { worker.postMessage({ type: 'SKIP_WAITING' }); }
        catch { finish(new Error('La mise à jour est inaccessible.')); }
      }
    });
  } else if (!registration.active) {
    throw new Error('La mise à jour n’est pas encore prête.');
  }
  reload();
}
