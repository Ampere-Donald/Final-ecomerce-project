import assert from 'node:assert/strict';
import test from 'node:test';
import { QZ_SIGNATURE_URL, requestQzSignature } from './qzSigning';

test('envoie toujours la signature QZ au domaine de l’application', async () => {
  let requestedUrl = '';
  let requestedInit: RequestInit | undefined;

  const signature = await requestQzSignature('a'.repeat(64), {
    token: 'ticket-caissier',
    requestId: 'qz-test',
    fetcher: async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return new Response(JSON.stringify({ signature: 'signature-valide' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.equal(QZ_SIGNATURE_URL, '/api/qz/sign');
  assert.equal(requestedUrl, '/api/qz/sign');
  assert.equal(requestedInit?.method, 'POST');
  assert.equal((requestedInit?.headers as Record<string, string>).Authorization, 'Bearer ticket-caissier');
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), { request: 'a'.repeat(64) });
  assert.equal(signature, 'signature-valide');
});

test('explique clairement une route de signature indisponible', async () => {
  await assert.rejects(
    requestQzSignature('a'.repeat(64), {
      token: 'ticket-caissier',
      fetcher: async () => new Response(JSON.stringify({ message: 'Route indisponible.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
    /Route indisponible/,
  );
});
