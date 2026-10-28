interface ReviewSession { query: string; label: string; savedAt: string }
const key = (user: string) => `newoteg:catalogue-session:v1:${user}`;
export function readSession(user: string): ReviewSession | null {
  try { return JSON.parse(localStorage.getItem(key(user)) || 'null'); } catch { return null; }
}
export function saveSession(user: string, query: string, label: string) {
  if (!user || !query) return;
  try { localStorage.setItem(key(user), JSON.stringify({ query, label, savedAt: new Date().toISOString() })); } catch { /* navigation still works */ }
}
