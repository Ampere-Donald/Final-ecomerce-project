import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientId } from '../utils/clientId';

test('génère un identifiant même lorsque Web Crypto est indisponible', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  try {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });

    assert.match(createClientId('legacy'), /^legacy-\d+-[a-z0-9]+$/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else Reflect.deleteProperty(globalThis, 'crypto');
  }
});

