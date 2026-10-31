import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { productEditorialEntries } from '../src/storefront/productEditorialData.js';
import { compileProductTranslations, translationModule } from './productTranslationModel.js';

export async function verifyProductTranslations({write=false}={}) {
  const input=new URL('../editorial/product-english.json',import.meta.url);
  const output=new URL('../src/storefront/productEnglish.generated.js',import.meta.url);
  const compiled=compileProductTranslations(JSON.parse(await readFile(input,'utf8')),productEditorialEntries);
  const expected=translationModule(compiled);
  if(write) await writeFile(output,expected);
  else {
    const current=await readFile(output,'utf8').catch(()=>'');
    if(current.replace(/\r\n/g,'\n')!==expected) throw Error('Product translations are stale. Run node tooling/prepareProductTranslations.mjs --write after reviewing the source and translation.');
  }
  return compiled;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.some(arg=>arg!=='--write')) throw Error('Usage: node tooling/prepareProductTranslations.mjs [--write]');
  const compiled=await verifyProductTranslations({write:args.includes('--write')});
  process.stdout.write(`Verified ${compiled.length} source-bound English product translations.\n`);
}
