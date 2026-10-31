import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileGuideTranslations} from '../tooling/guideTranslationModel.js';
import {verifyGuideTranslations} from '../tooling/prepareGuideTranslations.mjs';
import {preparedEnglishGuides} from '../src/storefront/guidesEnglish.generated.js';
import {editorialDocumentPaths} from '../src/storefront/editorialRoutes.js';
import {renderSitemapResponse} from '../src/storefront/publicSitemap.js';
const [copies,entries]=await Promise.all(['guides-english.json','entries.json'].map(name=>readFile(new URL('../editorial/'+name,import.meta.url),'utf8').then(JSON.parse)));
test('four full guide translations preserve structure, source URLs and related product identities',async()=>{
  const compiled=await verifyGuideTranslations();assert.equal(compiled.length,4);assert.deepEqual(compiled,preparedEnglishGuides);
  for(const translated of compiled) {
    const source=entries.find(entry=>entry.id===translated.sourceId);
    assert.equal(translated.language,'en');
    assert.deepEqual(translated.sources.map(source=>source.url),source.sources.map(source=>source.url));
    assert.deepEqual(translated.products.map(product=>product.id),source.products.map(product=>product.id));
    assert.deepEqual(translated.sections.map(section=>section.sources),source.sections.map(section=>section.sources));
    assert(!editorialDocumentPaths().includes('/en/guides/'+source.slug));
    assert(!renderSitemapResponse([]).includes('/en/guides/'+source.slug));
  }
});
test('guide publication cannot silently reuse a translation of changed source facts',()=>{
  const changed=structuredClone(entries);changed[0].limits[0]+=' New scope';
  assert.throws(()=>compileGuideTranslations(copies,changed,'2026-10-31'),/French guide changed/);
  assert.throws(()=>compileGuideTranslations([...copies,copies[0]],entries,'2026-10-31'),/duplicate/);
  const changes=[copy=>{copy.reviewedAt='2099-01-01';},copy=>{copy.reviewedAt='2026-02-30';},
    copy=>{copy.sections[0].sources=['different'];},copy=>{copy.sections[0].id='other';},copy=>{copy.sections[0].paragraphs=[];},
    copy=>{copy.sections[0].html='<script>unsafe</script>';},copy=>{copy.sourceLabels=[];},copy=>{copy.limits=[];},copy=>{copy.products=[];}];
  for(const change of changes) {const modified=structuredClone(copies);change(modified[0]);assert.throws(()=>compileGuideTranslations(modified,entries,'2026-10-31'));}
  const table=structuredClone(copies);table[1].sections[1].table.rows[0]=['missing column'];
  assert.throws(()=>compileGuideTranslations(table,entries,'2026-10-31'),/table/);
});
