// Inspect the actual emitted artifacts. No browser session or production write.
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedEditorial as frenchEditorial } from '../src/storefront/publishedEditorial.generated.js';
import { preparedEnglishGuides } from '../src/storefront/guidesEnglish.generated.js';
import { pathLanguage } from '../src/storefront/localePath.js';
const publishedEditorial = [...frenchEditorial, ...preparedEnglishGuides];
import { editorialDocumentPaths, editorialPath } from '../src/storefront/editorialRoutes.js';
import { verifyEditorial } from '../tooling/prepareEditorial.mjs';
import worker from '../worker.js';
const root = fileURLToPath(new URL('../', import.meta.url));
await verifyEditorial();
const { editorialFragments, editorialStyles } = await import('../.catalogue-ssr/editorial.js');
const require = createRequire(import.meta.url);
const runtime = require('../.catalogue-backend/renderer.cjs');
const entries = JSON.parse(await readFile(join(root, 'editorial/entries.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(root, 'dist/.vite/manifest.json'), 'utf8'));
const report = { writes: 0, status: 'passed', pages: [], draftLeakChecks: 0, initialBodyLeakChecks: 0 };
const out = process.env.OUT ? resolve(process.env.OUT) : null;
if (out) await mkdir(out, { recursive: true });
const document = await readFile(join(root, 'dist/index.html'), 'utf8');
const env = { ASSETS: { fetch: async () => new Response(document, { headers: { 'content-type': 'text/html' } }) }, editorialFragments, editorialStyles };
for (const path of editorialDocumentPaths()) {
  assert.equal(runtime.renderEditorialResponse(path), editorialFragments[path]);
  const response = await worker.fetch(new Request('https://newoteg.com' + path), env);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert(html.includes(`data-initial-editorial="${pathLanguage(path)}"`), path);
  assert(html.includes(`lang="${pathLanguage(path)}"`), path);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
  for (const css of editorialStyles) assert(html.includes(`href="${css}"`), css);
  const entry = publishedEditorial.find(entry => editorialPath(entry) === path);
  if (entry) {
    assert(html.includes(entry.title), path);
    assert(html.includes(`rel="canonical" href="https://newoteg.com${path}"`), path);
    for (const source of entry.sources) assert(html.includes(source.url), source.url);
    for (const section of entry.sections) assert(html.includes('id="' + section.id + '"'), section.id);
  }
  if (path === '/remplacement') assert(html.includes('noindex, follow'));
  report.pages.push({path, status:200, bytes:Buffer.byteLength(html)});
  if (out) await writeFile(join(out, path.slice(1).replaceAll('/', '-') + '.html'), html);
}
async function emittedFiles(directory) {
  const result = [];
  for (const item of await readdir(directory, {withFileTypes:true})) {
    const path = join(directory, item.name);
    if (item.isDirectory()) result.push(...await emittedFiles(path));
    else if (/\.(?:m?js|cjs|html|json)$/.test(item.name)) result.push(path);
  }
  return result;
}
const emitted = [...await emittedFiles(join(root, 'dist')), ...await emittedFiles(join(root, '.catalogue-backend')), ...await emittedFiles(join(root, '.catalogue-ssr'))];
for (const file of emitted) {
  const content = await readFile(file, 'utf8');
  for (const entry of entries.filter(entry => entry.status !== 'published')) {
    for (const needle of [entry.id, entry.slug, entry.title, ...entry.publicationBlockers]) {
      assert(!content.includes(needle), `Private draft leaked: ${file}`);
      report.draftLeakChecks++;
    }
  }
}
const seen = new Set();
async function inspectInitial(key) {
  if (seen.has(key)) return;
  seen.add(key);
  const item = manifest[key]; assert(item, key);
  const content = await readFile(join(root, 'dist', item.file), 'utf8');
  for (const entry of publishedEditorial) {
    assert(!content.includes(entry.sections[0].paragraphs[0]), 'Guide body eagerly loaded in ' + item.file);
    report.initialBodyLeakChecks++;
  }
  for (const child of item.imports || []) await inspectInitial(child);
}
await inspectInitial('index.html');
for (const entry of entries.filter(entry => entry.status !== 'published')) {
  const response = await worker.fetch(new Request('https://newoteg.com' + editorialPath(entry)), env);
  assert.equal(response.status, 404);
  assert.throws(() => runtime.renderEditorialResponse(editorialPath(entry)));
  report.pages.push({path:editorialPath(entry),status:404});
}
if (out) await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
