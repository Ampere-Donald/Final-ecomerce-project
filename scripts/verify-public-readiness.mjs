// One-shot anonymous GET checks. No orders, credentials, notifications or timers.
// Store only assertions/capabilities, never response bodies or customer records.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
assert(args.length === 2 && args[0] === '--output',
  'Usage: node scripts/verify-public-readiness.mjs --output <report.json>');
const report = {
  checkedAt: new Date().toISOString(),
  origin: 'https://newoteg.com',
  scope: 'Anonymous public GET checks only; no commerce acceptance, field performance or business validation.',
  checks: [], capabilities: {}, status: 'running',
};
async function check(name, path, verify) {
  const entry = { name, path, status: 'failed' };
  report.checks.push(entry);
  try {
    const response = await fetch(report.origin + path, {
      method: 'GET', credentials: 'omit', redirect: 'error',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(20000),
    });
    entry.httpStatus = response.status;
    await verify(response);
    entry.status = 'passed';
  } catch {
    // Do not persist a remote response, request payload, stack or secret URL.
    entry.error = 'Request or expected contract failed; investigate this named check.';
  }
}
const okJson = async response => {
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/i);
  return response.json();
};
await check('API, database and storage health', '/api/health', async r => {
  const value = await okJson(r);
  assert.equal(value.status, 'ok');
  for (const key of ['api', 'database', 'storage']) assert.equal(value.checks?.[key], 'ok');
});
await check('Declared guest delivery channels', '/api/commandes/guest/channels', async r => {
  const value = await okJson(r);
  assert.equal(typeof value.email, 'boolean');
  assert.equal(typeof value.sms, 'boolean');
  report.capabilities.guestMessages = { email: value.email, sms: value.sms };
});
await check('Declared journey collection', '/api/parcours/disponibilite', async r => {
  const value = await okJson(r);
  assert.equal(typeof value.actif, 'boolean');
  report.capabilities.journeyCollection = value.actif;
});
await check('Published projects availability', '/api/projets?page=1&limit=1', async r => {
  const value = await okJson(r);
  assert(Array.isArray(value.data));
  assert(value.data.length <= 1);
  assert(Number.isSafeInteger(value.meta?.total) && value.meta.total >= value.data.length);
  report.capabilities.publishedProjects = value.meta.total;
});
for (const path of ['/panier', '/checkout', '/suivi-invite', '/mes-devis', '/commandes', '/profile', '/login']) {
  await check('Private document headers', path, async r => {
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /text\/html/i);
    const cache = r.headers.get('cache-control') || '';
    assert.match(cache, /\bprivate\b/i);
    assert.match(cache, /\bno-store\b/i);
    const robots = r.headers.get('x-robots-tag') || '';
    assert.match(robots, /\bnoindex\b/i);
    assert.match(robots, /\bnofollow\b/i);
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  });
}
for (const path of ['/', '/catalogue', '/equivalences']) {
  await check('Public initial metadata', path, async r => {
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /text\/html/i);
    const html = await r.text();
    assert.equal([...html.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>/gi)].length, 1);
    assert.match(html, /<title\b[^>]*>[^<]+<\/title>/i);
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
    const canonicals = links.filter(link => /\brel=["']canonical["']/i.test(link));
    assert.equal(canonicals.length, 1);
    assert(canonicals[0].includes(`href="${report.origin}${path}"`));
    if (path === '/') assert.match(html, /<div\b[^>]*\bid="root"[^>]*\bdata-initial-home="fr"/);
  });
}
await check('Unknown document HTTP status', '/__newoteg_readiness_not_found__', async r => {
  assert.equal(r.status, 404);
  assert.match(r.headers.get('x-robots-tag') || '', /\bnoindex\b/i);
});
report.status = report.checks.every(check => check.status === 'passed') ? 'passed' : 'failed';
report.finishedAt = new Date().toISOString();
await writeFile(resolve(args[1]), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: report.checks.length,
  failed: report.checks.filter(check => check.status === 'failed').map(check => check.name + ': ' + check.path),
  capabilities: report.capabilities }));
if (report.status === 'failed') process.exitCode = 1;
