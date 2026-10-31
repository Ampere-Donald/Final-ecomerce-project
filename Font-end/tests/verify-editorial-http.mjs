// Run against a local Worker or the published site; anonymous reads only.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { publishedEditorial as frenchEditorial } from '../src/storefront/publishedEditorial.generated.js';
import { preparedEnglishGuides } from '../src/storefront/guidesEnglish.generated.js';
import { pathLanguage } from '../src/storefront/localePath.js';
const publishedEditorial = [...frenchEditorial, ...preparedEnglishGuides];
import { editorialPath, editorialDocumentPaths } from '../src/storefront/editorialRoutes.js';
const origin = new URL(process.env.ORIGIN || 'http://127.0.0.1:8877').origin;
const out = process.env.OUT ? resolve(process.env.OUT) : null;
if (out) await mkdir(out, { recursive:true });
const report = {at:new Date().toISOString(),origin,writes:0,checks:[],status:'running'};
async function read(path, method = 'GET', redirect = 'follow') {
  return fetch(origin + path, {method,redirect,headers:{Accept:'text/html'},signal:AbortSignal.timeout(30000)});
}
try {
  for (const path of editorialDocumentPaths()) {
    const response = await read(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert(html.includes(`data-initial-editorial="${pathLanguage(path)}"`), path);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
    const entry = publishedEditorial.find(entry => editorialPath(entry) === path);
    if (entry) {
      assert(html.includes(entry.title), path);
      assert(html.includes(`rel="canonical" href="https://newoteg.com${path}"`), path);
      for (const section of entry.sections) assert(html.includes(`id="${section.id}"`), section.id);
      for (const source of entry.sources) assert(html.includes(source.url), source.label);
    }
    if (path === '/remplacement') assert(html.includes('noindex, follow'));
    for (const css of [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/assets\/[^\"]+)"/g)].map(match => match[1])) {
      const response = await fetch(origin + css, {signal:AbortSignal.timeout(10000)});
      assert.equal(response.status, 200, css); assert(response.headers.get('content-type')?.includes('text/css'), css);
      await response.body?.cancel();
    }
    const head = await read(path, 'HEAD'); assert.equal(head.status, 200); assert.equal(await head.text(), '');
    report.checks.push({path,type:'initial-html-canonical-sources-styles-head',status:'passed'});
    if (out) await writeFile(join(out, path.slice(1).replaceAll('/', '-') + '.html'), html);
  }
  for (const path of ['/guides/missing-guide', '/remplacement/4700uf-63v-formats-courts', '/remplacement/alternative-dt830d-sd9206a']) {
    const response = await read(path); assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    await response.body?.cancel();
    report.checks.push({path,type:'unpublished-or-unknown',status:'passed'});
  }
  const path = editorialPath(publishedEditorial[0]);
  const alias = await read(path.toUpperCase() + '/?utm_source=check', 'GET', 'manual');
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get('location'), origin + path + '?utm_source=check');
  report.checks.push({path,type:'canonical-path-alias',status:'passed'});
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = String(error); process.exitCode = 1;
} finally {
  if (out) await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
