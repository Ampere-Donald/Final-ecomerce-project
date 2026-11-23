'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sourceConsistencyRisks}=require('./source-consistency.cjs');
const {profileFor}=require('./family-content.cjs');
const p=title=>({original:{title,subcategory:null}});
test('does not reuse mechanical mixer prose for optocouplers or network couplers',()=>{
 assert.ok(sourceConsistencyRisks(p('Optocoupleur CNX83C'),'Coupleur de transmission entre bol et moteur de mixeur').length);
 assert.ok(sourceConsistencyRisks(p('Coupleur RJ45 femelle-femelle'),'Coupleur de transmission entre bol et moteur de mixeur').length);
 assert.equal(sourceConsistencyRisks(p('Coupleur de bol de mixeur'),'Coupleur de transmission entre bol et moteur de mixeur').length,0);
 assert.ok(sourceConsistencyRisks(p('Servomoteur MG90S'),'Engrenage plastique de mécanisme').length);
 assert.equal(sourceConsistencyRisks(p('Coupleur RJ45 femelle-femelle'),'Coupleur RJ45. La description précédente de pièce de mixeur est écartée.').length,0);
 assert.equal(sourceConsistencyRisks(p('Circuit BA6222 pilote moteur'),'Commande réversible de moteur continu').length,0);
});
test('assigns optical isolation and RJ45 connection to their actual documentary families',()=>{
 assert.equal(profileFor(p('Optocoupleur CNX83C'))[1],'semiconducteurs');
 assert.equal(profileFor(p('Coupleur RJ45 femelle-femelle'))[1],'connectique');
});
