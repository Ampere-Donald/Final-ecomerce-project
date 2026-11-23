import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupChoices,projectQuoteText} from '../src/storefront/projectGroups.js';
test('group multiplier preserves choices, bounds quantities and never mutates inputs',()=>{
 const rows=[{id:'a',quantite:2,necessaire:true,product:{reference:'123'}},{id:'b',quantite:1,necessaire:false}];
 const initial={a:{selected:true,quantity:'2'},b:{selected:false,quantity:'1'}};
 const next=groupChoices(rows,initial,3);
 assert.equal(next.a.quantity,'6');assert.equal(next.b.selected,false);assert.equal(initial.a.quantity,'2');
 assert.throws(()=>groupChoices(rows,initial,0));assert.throws(()=>groupChoices(rows,initial,1.5));assert.throws(()=>groupChoices([{id:'a',quantite:20}],initial,1000));
 assert.equal(projectQuoteText(rows,next),'123; 6');assert.equal(projectQuoteText([{id:'a',quantite:1}],next),'');
});
