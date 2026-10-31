import { readFile, writeFile } from 'node:fs/promises';
import { verifyProductTranslations } from './prepareProductTranslations.mjs';
import { verifyGuideTranslations } from './prepareGuideTranslations.mjs';

// This small publication index carries no guide bodies or product copy into
// the eager client graph. Both source-bound compilations must pass first.
export async function verifyEnglishRoutes({ write = false } = {}) {
  const products = await verifyProductTranslations({ write });
  const guides = await verifyGuideTranslations({ write });
  const text = '// Generated from reviewed translations; do not edit.\n' +
    `export const englishProductIds = ${JSON.stringify(products.map(entry => entry.id))};\n` +
    `export const englishGuideIndex = ${JSON.stringify(guides.map(({ id, sourceId, slug, language, type, title, summary, families }) => ({ id, sourceId, slug, language, type, title, summary, families })))};\n`;
  const path = new URL('../src/storefront/englishRoutes.generated.js', import.meta.url);
  if (write) await writeFile(path, text);
  else if ((await readFile(path, 'utf8')).replace(/\r\n/g, '\n') !== text) throw Error('English route index is stale');
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareEnglishRoutes.mjs')) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--write')) throw Error('Usage: node tooling/prepareEnglishRoutes.mjs [--write]');
  await verifyEnglishRoutes({ write: args.includes('--write') });
}
