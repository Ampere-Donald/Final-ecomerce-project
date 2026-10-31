// Check the emitted HTML, not just the source generator. No network or writes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { organizationData } from '../src/storefront/organizationData.js';
import worker from '../worker.js';
const document = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const ASSETS = { fetch: async request => {
  if (new URL(request.url).pathname === '/__public-home.json') return new Response(await readFile(new URL('../dist/__public-home.json', import.meta.url)), { headers: { 'content-type': 'application/json' } });
  return new Response(request.method === 'HEAD' ? null : document, { headers: { 'content-type': 'text/html' } });
} };
for (const path of ['/', '/contact', '/checkout']) {
  const response = await worker.fetch(new Request('https://newoteg.com' + path), { ASSETS });
  const html = await response.text();
  const tags = [...html.matchAll(/<script type="application\/ld\+json" data-newoteg-organization>([\s\S]*?)<\/script>/g)];
  assert.equal(tags.length, 1, path);
  assert.deepEqual(JSON.parse(tags[0][1]), organizationData());
  assert(html.indexOf(tags[0][0]) < html.indexOf('</head>'));
  if (path === '/') assert(html.includes('data-initial-home="fr"'));
  if (path === '/checkout') {
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert(!html.includes('rel="canonical"'));
  }
}
console.log(JSON.stringify({ status: 'passed', checks: ['emitted JSON-LD identity', 'one persistent head owner', 'public home SSR retained', 'private noindex and no-store retained'], organization: organizationData() }));
