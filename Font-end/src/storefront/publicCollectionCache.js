import apiClient from "../utils/apiClient";
// Public browsing data only; checkout and private data never enter this cache.
const cache = new Map(), waiting = [];
let active = 0;
function drain() {
  while (active < 2 && waiting.length) {
    const job = waiting.shift(); active++;
    apiClient.get(job.path, { timeout: 12000 }).then(r => job.resolve(r.data), job.reject).finally(() => { active--; drain(); });
  }
}
export function publicCollectionGet(path) {
  if (path !== "/categories" && !/^\/produits(?:\?|\/(?:populaires|arrivages|flash)$)/.test(path)) return Promise.reject(Error("Not a public collection"));
  const existing = cache.get(path);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const promise = new Promise((resolve, reject) => { waiting.push({ path, resolve, reject }); drain(); });
  cache.set(path, { promise, expires: Date.now() + 30000 });
  promise.catch(() => { if (cache.get(path)?.promise === promise) cache.delete(path); });
  if (cache.size > 50) cache.delete(cache.keys().next().value);
  return promise;
}
