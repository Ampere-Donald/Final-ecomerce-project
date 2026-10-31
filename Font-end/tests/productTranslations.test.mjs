import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileProductTranslations } from '../tooling/productTranslationModel.js';
import { verifyProductTranslations } from '../tooling/prepareProductTranslations.mjs';
import { productEnglishTranslations } from '../src/storefront/productEnglish.generated.js';
import { productEditorialEntries } from '../src/storefront/productEditorialData.js';
import { getProductTranslation, productText } from '../src/storefront/productTranslation.js';
import { getProductEditorial } from '../src/storefront/productEditorial.js';
import { productSchema } from '../src/storefront/productSchema.js';

const copies=JSON.parse(await readFile(new URL('../editorial/product-english.json',import.meta.url),'utf8'));
const product=entry=>({id:entry.id,...entry.expected,attributes:[],technicalAttributes:[],retailPrice:1500,stock:2});
test('twenty complete English translations preserve the exact French identity and documentary sources', async()=>{
  const compiled=await verifyProductTranslations();
  assert.equal(compiled.length,20);
  assert.deepEqual(compiled,productEnglishTranslations);
  for(const entry of productEditorialEntries) {
    const p=product(entry), copy=getProductTranslation(p);
    assert(copy,entry.id);
    assert.deepEqual(copy.en.sources.map(source=>source.url),entry.fr.sources.map(source=>source.url));
    assert.equal(copy.en.checks.length,entry.fr.checks.length);
    assert.equal(getProductEditorial(p,'en').en.title,copy.en.title);
    assert.equal(getProductEditorial(p,'en').reviewedAt,'2026-10-31');
    assert.equal(productText(p,'fr').description,entry.expected.description);
    assert.equal(productText(p,'en').description,copy.en.description);
    const schema=productSchema(p,'en')['@graph'][0];
    assert.equal(schema.name,copy.en.name);assert.equal(schema.description,copy.en.description);
    assert.equal(schema.offers.price,1500);assert.equal(schema.offers.priceCurrency,'XAF');
    for(const key of ['price','retailPrice','stock','quantiteStock','cost','cmupActuel']) assert(!Object.hasOwn(copy.en,key));
  }
});
test('a changed French source cannot silently inherit its old translation review',()=>{
  for(const change of [entry=>{entry.fr.summary+=' New evidence';},entry=>{entry.expected.model+=' changed';},
    entry=>{entry.fr.sources[0].url='https://example.com/different';}]) {
    const entries=structuredClone(productEditorialEntries);change(entries[0]);
    assert.throws(()=>compileProductTranslations(copies,entries,'2026-10-31'),/French source changed/);
  }
  assert.throws(()=>compileProductTranslations([...copies,copies[0]],productEditorialEntries,'2026-10-31'),/duplicate/);
  for(const change of [copy=>{copy.reviewedAt='2026-02-30';},copy=>{copy.reviewedAt='2099-01-01';},
    copy=>{copy.sourceLabels=[];},copy=>{copy.checks=[];},copy=>{copy.description='';},copy=>{copy.sources=['https://other.example/'];},
    copy=>{copy.price=100;}]) {
    const selected=structuredClone(copies);change(selected[0]);
    assert.throws(()=>compileProductTranslations(selected,productEditorialEntries,'2026-10-31'));
  }
});
test('catalogue changes withdraw translated claims and preserve the current commercial record',()=>{
  const p=product(productEditorialEntries[0]);
  for(const changed of [{...p,model:p.model+' new'},{...p,description:'New catalogue description'},
    {...p,brand:'New manufacturer'},{...p,image:'/new-image.webp'},{...p,urlDatasheet:'https://example.com/manual'},
    {...p,attributes:[['Voltage','63V']]},{...p,technicalAttributes:[{name:'Voltage'}]}]) {
    assert.equal(getProductTranslation(changed),null);
    assert.equal(getProductEditorial(changed,'en'),null);
    assert.equal(productText(changed,'en').description,changed.description||'');
  }
  assert.ok(getProductTranslation({...p,retailPrice:999,stock:0}));
  assert.equal(productSchema({...p,retailPrice:999,stock:0},'en')['@graph'][0].offers.price,999);
});
