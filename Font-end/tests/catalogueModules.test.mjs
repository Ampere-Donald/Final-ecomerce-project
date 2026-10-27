import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueModules, startCatalogueModules } from '../tooling/catalogueModules.js';
import { canRenderCatalogue } from '../src/storefront/catalogueQuery.js';

const chunk = (fileName, imports = [], extra = {}) => ({ type:'chunk', fileName, imports, ...extra });
const graph = () => ({
  'assets/Catalogue-hash.js': chunk('assets/Catalogue-hash.js', ['assets/card-hash.js','assets/main-hash.js'],
    {isDynamicEntry:true,facadeModuleId:'C:/build/src/storefront/Catalogue.jsx',dynamicImports:['assets/private.js']}),
  'assets/card-hash.js': chunk('assets/card-hash.js', ['assets/main-hash.js']),
  'assets/main-hash.js': chunk('assets/main-hash.js', ['assets/card-hash.js'], {isEntry:true}),
  'assets/private.js': chunk('assets/private.js'),
});
test('resolve the exact static catalogue graph once without reloading the entry or private dynamic pages', () => {
  assert.deepEqual(catalogueModules(graph()), ['/assets/Catalogue-hash.js','/assets/card-hash.js']);
  for (const mode of ['absent','ambiguous','missing','invalid']) {
    const bundle = graph();
    if(mode==='absent')delete bundle['assets/Catalogue-hash.js'];
    if(mode==='ambiguous')bundle['assets/other.js']={...bundle['assets/Catalogue-hash.js']};
    if(mode==='missing')delete bundle['assets/card-hash.js'];
    if(mode==='invalid')bundle['assets/card-hash.js'].imports=['https://other.example/module.js'];
    assert.throws(()=>catalogueModules(bundle),/catalogue/);
  }
});
test('native module hints are limited to valid catalogue routes and gracefully skip unsupported browsers', () => {
  for(const path of ['/catalogue','/catalogue?search=NE555','/','/login','/suivi-invite','/catalogue?token=private']) {
    for(const supported of [true,false]) {
      const links=[];
      const win={URL,location:new URL(path,'https://newoteg.com'),document:{
        head:{appendChild:n=>links.push(n)},
        createElement:()=>({relList:{supports:()=>supported},setAttribute(){}}),
      }};
      startCatalogueModules(win,['/assets/Catalogue-hash.js'],canRenderCatalogue);
      const expected=canRenderCatalogue(win.location)&&supported;
      assert.equal(links.length,expected?1:0);
      if(expected)assert.deepEqual([links[0].rel,links[0].crossOrigin,links[0].href],['modulepreload','','/assets/Catalogue-hash.js']);
    }
  }
  assert.doesNotThrow(()=>startCatalogueModules({URL,location:{href:'https://newoteg.com/catalogue'},document:{createElement(){throw Error('DOM unavailable')}}},[],canRenderCatalogue));
});
