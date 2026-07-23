/**
 * Génère un identifiant côté navigateur sans supposer que Web Crypto est
 * disponible. Certains anciens navigateurs Android exposent `crypto`
 * partiellement, surtout lorsque la page a été ouverte en HTTP.
 */
export function createClientId(prefix = 'web'): string {
  const cryptoApi =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? globalThis.crypto
      : undefined;

  if (typeof cryptoApi?.randomUUID === 'function') {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // Le repli ci-dessous reste utilisable sur les contextes non sécurisés.
    }
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
