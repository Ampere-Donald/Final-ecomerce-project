/**
 * Génère un UUID v4 côté navigateur sans supposer que `crypto.randomUUID`
 * est disponible. Certains anciens navigateurs Android exposent `crypto`
 * seulement en partie.
 */
function fallbackUuidV4(cryptoApi?: Crypto): string {
  const bytes = new Uint8Array(16);

  if (typeof cryptoApi?.getRandomValues === 'function') {
    try {
      cryptoApi.getRandomValues(bytes);
    } catch {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122: UUID version 4, variante 10xx.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  let value = '';
  for (let index = 0; index < bytes.length; index += 1) {
    if (index === 4 || index === 6 || index === 8 || index === 10) value += '-';
    value += (bytes[index] + 0x100).toString(16).slice(1);
  }
  return value;
}

export function createClientId(_prefix = 'web'): string {
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

  return fallbackUuidV4(cryptoApi);
}
