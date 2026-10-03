import test from 'node:test';
import assert from 'node:assert/strict';
import {newGuestKey,rememberGuestKey,readGuestKey,forgetGuestKey,captureGuestFragment,saveGuestRecovery,readGuestRecovery,clearGuestRecovery} from '../src/storefront/guestAccess.js';
import {saveAttempt,readAttempt} from '../src/storefront/orderAttempt.js';
const map=new Map();
globalThis.sessionStorage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
test('CSPRNG keys are 256-bit and survive the exact saved order attempt',()=>{
  const key=newGuestKey();assert.match(key,/^[A-Za-z0-9_-]{43}$/);assert.equal(Buffer.from(key,'base64url').length,32);assert.notEqual(key,newGuestKey());
  saveAttempt({requestId:crypto.randomUUID(),guestAccessKey:key,guestEmail:'guest@example.invalid',lignes:[{produitId:'p',quantite:1}]},'/commandes/checkout');
  assert.equal(readAttempt().payload.guestAccessKey,key);assert.equal(readAttempt().payload.guestEmail,'guest@example.invalid');
});
test('Private fragments are removed from location before rendering and kept only in session',()=>{
  const key=newGuestKey();let replaced;
  globalThis.window={location:{pathname:'/suivi-invite',hash:'#acces='+key},history:{state:{},replaceState:(_state,_title,url)=>{replaced=url;}}};
  captureGuestFragment();assert.equal(replaced,'/suivi-invite');assert.equal(readGuestKey(),key);
  assert.throws(()=>rememberGuestKey('bad'));
  forgetGuestKey();assert.equal(readGuestKey(),'');
});
test('Recovery keeps the same key for an uncertain redemption, without saving its OTP',()=>{
  const key=newGuestKey(), challengeId=crypto.randomUUID();saveGuestRecovery(challengeId,key);
  assert.deepEqual(readGuestRecovery(),{challengeId,key});assert.equal(readGuestKey(),key);
  assert.deepEqual(Object.keys(JSON.parse(map.get('newoteg_guest_recovery_v1'))).sort(),['challengeId','key']);
  clearGuestRecovery();assert.equal(readGuestRecovery(),null);
});
