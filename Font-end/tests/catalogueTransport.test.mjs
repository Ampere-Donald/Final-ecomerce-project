import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueTransportBase, isCatalogueRead } from '../src/utils/catalogueTransport.js';

test('production catalogue transport uses the existing HTTPS storefront proxy only for the configured shop API', () => {
  for (const hostname of ['newoteg.com', 'www.newoteg.com'])
    for (const base of ['https://api.newoteg.com','https://api.newoteg.com/','https://api.newoteg.com/api','https://api.newoteg.com/api/'])
      assert.equal(catalogueTransportBase(base,{protocol:'https:',hostname}),'/api');
  for (const location of [undefined,{protocol:'http:',hostname:'newoteg.com'},{protocol:'https:',hostname:'admin.newoteg.com'},
    {protocol:'https:',hostname:'newoteg.com.other.example'},{protocol:'http:',hostname:'127.0.0.1'}])
    assert.equal(catalogueTransportBase('https://api.newoteg.com/api',location),'https://api.newoteg.com/api');
  for (const base of ['/api','http://localhost:3000/api','https://other.example/api','https://api.newoteg.com/api/private',undefined])
    assert.equal(catalogueTransportBase(base,{protocol:'https:',hostname:'newoteg.com'}),base);
});

test('transport selection never catches writes, private endpoints or explicitly absolute URLs', () => {
  for (const method of ['get','GET',undefined])
    for (const path of ['/produits','/produits?page=2&sort=price_desc','/categories?includeSousCategories=true','/produits/11111111-1111-4111-8111-111111111111'])
      assert.equal(isCatalogueRead(method,path),true);
  for (const method of ['post','put','patch','delete','head']) assert.equal(isCatalogueRead(method,'/produits'),false);
  for (const path of ['/auth/me','/commandes','/produits/pricing','/categories/revision','//other.example/produits','https://api.newoteg.com/api/produits','/produits#secret','/produits/../../auth/me',undefined])
    assert.equal(isCatalogueRead('get',path),false);
});
