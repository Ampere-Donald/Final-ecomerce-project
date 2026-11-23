import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readProductContent,essentialSpecifications,designationSpecifications,publicProductDocumentation,mergeEditorialContent} from '../src/storefront/productContent.js';
const fr={summary:'Résumé',paragraphs:['Description'],applications:[],integration:[],replacement:[],missing:[],faq:[],documents:[]};
test('published content does not mix French into English and fails closed on invalid content',()=>{
 const c={schemaVersion:1,locales:{fr}};
 assert.equal(readProductContent(c,'fr').summary,'Résumé');assert.equal(readProductContent(c,'en'),null);
 assert.equal(readProductContent({schemaVersion:1,locales:{fr:{...fr,paragraphs:null}}}),null);
 assert.deepEqual(readProductContent({schemaVersion:1,locales:{fr:{...fr,documents:[{url:'javascript:alert(1)',label:'Unsafe',scope:'family'}]}}}).documents,[]);
});
test('existing reviewed editorial material is retained without duplicate blocks',()=>{
 const result=mergeEditorialContent({...fr,replacement:['Comparer.']},{summary:'Conseil spécifique déjà relu.',checks:['Comparer.','Contrôler le boîtier.'],sources:[{url:'https://www.st.com/a.pdf',label:'ST'},{url:'javascript:alert(1)',label:'Invalid'}]});
 assert.equal(result.paragraphs.at(-1),'Conseil spécifique déjà relu.');assert.deepEqual(result.replacement,['Comparer.','Contrôler le boîtier.']);assert.equal(result.documents.length,1);
});
test('designation values remain literal and unknown family properties are not inferred',()=>{
 assert.equal(designationSpecifications({model:'Condensateur 4 700 µF 63 V'})[0].value,'4 700 µF');
 assert.deepEqual(designationSpecifications({model:'VIPER 50A'}),[]);
 assert.equal(designationSpecifications({model:'Condensateur non polarisé 1 µF 400 V'}).some(v=>v.value==='Polarisé'),false);
 const clean=publicProductDocumentation({schemaVersion:1,family:'passifs',actorId:'private',locales:{fr:{...fr,privateNote:'secret'}}});
 assert.equal(JSON.stringify(clean).includes('secret'),false);assert.equal(JSON.stringify(clean).includes('private'),false);
});
test('hero uses only current documented attributes, never family or proposal values',()=>{
 const p={technicalAttributes:[{label:'Capacité',values:[{value:'4700 µF',source:{etat:'DOCUMENTE'}}]},{label:'Courant',values:[{value:'10 A',source:{etat:'A_VERIFIER'}}]},{label:'Tension',values:[{value:'63 V',source:{etat:'DOCUMENTE',obsolete:true}}]}]};
 assert.deepEqual(essentialSpecifications(p),[{label:'Capacité',value:'4700 µF'}]);
});
