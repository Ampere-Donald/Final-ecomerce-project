// Anonymous production recipe, after publication. No cookies or write methods.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const out = process.env.OUT ? resolve(process.env.OUT) : null;
if (out) await mkdir(out, { recursive: true });
const report = { at: new Date().toISOString(), writes: 0, client: 'Node native fetch', checks: [], status: 'running' };
const paths = ['/', '/catalogue/condensateurs?page=2', '/product/02d5805f-7f51-4574-938d-d8cfe8c09487'];
try {
  for (const origin of ['http://newoteg.com', 'http://www.newoteg.com', 'https://www.newoteg.com']) {
    for (const path of paths) {
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 308, origin + path);
      assert.equal(response.headers.get('location'), 'https://newoteg.com' + path);
      await response.body?.cancel();
      const final = await fetch(response.headers.get('location'), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      assert.equal(final.status, 200, 'Redirect destination');
      const body = await final.text();
      assert(body.includes('rel="canonical" href="https://newoteg.com' + path + '"'), 'Final canonical');
      if (path.startsWith('/catalogue')) assert(body.includes('data-initial-catalogue="fr"'), 'Catalogue SSR retained');
      if (path.startsWith('/product')) assert(body.includes('data-initial-product="fr"'), 'Product SSR retained');
      report.checks.push({ url: origin + path, status: 308, destination: response.headers.get('location'), destinationStatus: 200 });
    }
  }
  for (const path of ['/checkout', '/suivi-invite', '/mes-devis/seo-audit-not-an-order']) {
    const response = await fetch('https://www.newoteg.com' + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    await response.body?.cancel();
    report.checks.push({ path, type: 'private-origin-and-protections-preserved', status: 200 });
  }
  const head = await fetch('http://www.newoteg.com/catalogue', { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(head.status, 308); assert.equal(await head.text(), '');
  report.checks.push({ type: 'head-redirect-without-body', status: 308 });
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error); process.exitCode = 1; }
finally {
  if (out) await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
