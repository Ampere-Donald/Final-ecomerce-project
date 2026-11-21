// Keep native history restoration, and honour a guide anchor on entry or a
// language change. Lazy route content may arrive after the navigation effect.
export function restoreRoutePosition(win, doc, hash, navigationType) {
  if (!hash) {
    if (navigationType !== 'POP') win.scrollTo(0, 0);
    return () => {};
  }
  let id;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return () => {}; }
  const reveal = () => {
    const target = doc.getElementById(id);
    if (!target) return false;
    target.scrollIntoView();
    return true;
  };
  if (reveal() || typeof win.MutationObserver !== 'function') return () => {};
  const observer = new win.MutationObserver(() => {
    if (reveal()) { observer.disconnect(); win.clearTimeout(timer); }
  });
  observer.observe(doc.getElementById('main-content') || doc.body, { childList: true, subtree: true });
  const timer = win.setTimeout(() => observer.disconnect(), 5000);
  return () => { observer.disconnect(); win.clearTimeout(timer); };
}
