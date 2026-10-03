import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
test('Private document has no-cache/noindex/no-referrer headers before JavaScript executes',async()=>{
  const env={ASSETS:{fetch:async()=>new Response('<html>SPA</html>',{headers:{'Cache-Control':'public, max-age=3600'}})}};
  for(const path of ['/suivi-invite','/suivi-invite/']) {
    const result=await worker.fetch(new Request('https://example.invalid'+path),env);
    assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(result.headers.get('x-robots-tag'),'noindex, nofollow');assert.equal(result.headers.get('referrer-policy'),'no-referrer');
    assert.equal(await result.text(),'<html>SPA</html>');
  }
  const publicPage=await worker.fetch(new Request('https://example.invalid/catalogue'),env);assert.equal(publicPage.headers.get('cache-control'),'public, max-age=3600');assert.equal(publicPage.headers.get('x-robots-tag'),null);
});
test('Guest API success and error responses are private; proxy body remains unmodified',async()=>{
  const previous=globalThis.fetch;let captured;
  try {
    globalThis.fetch=async request=>{captured=request;return new Response('{"message":"Unavailable"}',{status:401});};
    const result=await worker.fetch(new Request('https://example.invalid/api/commandes/guest/access',{method:'POST',body:'{"accessToken":"fixture-only"}',headers:{'Content-Type':'application/json'}}),{});
    assert.equal(result.status,401);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(result.headers.get('x-robots-tag'),'noindex, nofollow');assert.equal(await captured.text(),'{"accessToken":"fixture-only"}');
    assert.equal(new URL(captured.url).pathname,'/api/commandes/guest/access');
  } finally {globalThis.fetch=previous;}
});
