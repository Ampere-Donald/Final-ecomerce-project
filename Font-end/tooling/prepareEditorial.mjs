import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { compileEditorial, editorialModule } from './editorialModel.js';
import { seoFamilies } from '../src/storefront/seoFamilies.js';

export async function verifyEditorial({ write = false } = {}) {
  const input = new URL('../editorial/entries.json', import.meta.url);
  const output = new URL('../src/storefront/publishedEditorial.generated.js', import.meta.url);
  const entries = JSON.parse(await readFile(input, 'utf8'));
  const published = compileEditorial(entries, seoFamilies.map(family => family.slug));
  const expected = editorialModule(published);
  const index = published.map(({ id, slug, language, type, title, summary, reviewedAt, families, products }) =>
    ({ id, slug, language, type, title, summary, reviewedAt, families, productIds: products.map(product => product.id) }));
  const indexFile = new URL('../src/storefront/editorialIndex.generated.js', import.meta.url);
  const indexText = '// Generated publication index; bodies stay in the lazy editorial chunk.\n' + `export const editorialIndex = ${JSON.stringify(index, null, 2)};\n`;
  for (const [file, content] of [[output, expected], [indexFile, indexText]]) {
    if (write) await writeFile(file, content);
    else {
      const current = await readFile(file, 'utf8').catch(() => '');
      if (current.replace(/\r\n/g, '\n') !== content) throw Error('Editorial projection is stale. Run node tooling/prepareEditorial.mjs --write and review the published diff.');
    }
  }
  return published;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--write')) throw Error('Usage: node tooling/prepareEditorial.mjs [--write]');
  const published = await verifyEditorial({ write: args.includes('--write') });
  process.stdout.write(`Editorial publication verified: ${published.length} published entries.\n`);
}
