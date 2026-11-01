import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileGuideTranslations,guideTranslationModule } from './guideTranslationModel.js';

export async function verifyGuideTranslations({write=false}={}) {
  const [copies,entries]=await Promise.all(['guides-english.json','entries.json'].map(name=>readFile(new URL('../editorial/'+name,import.meta.url),'utf8').then(JSON.parse)));
  const compiled=compileGuideTranslations(copies,entries);
  const output=new URL('../src/storefront/guidesEnglish.generated.js',import.meta.url);
  const expected=guideTranslationModule(compiled);
  if(write) await writeFile(output,expected);
  else {
    const current=await readFile(output,'utf8').catch(()=>'');
    if(current.replace(/\r\n/g,'\n')!==expected) throw Error('Guide translations are stale. Run node tooling/prepareGuideTranslations.mjs --write after review.');
  }
  return compiled;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.some(arg=>arg!=='--write')) throw Error('Usage: node tooling/prepareGuideTranslations.mjs [--write]');
  const entries=await verifyGuideTranslations({write:args.includes('--write')});
  process.stdout.write(`Verified ${entries.length} prepared English guides.\n`);
}
