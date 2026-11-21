const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decide, proposedText } = require('./policy.cjs');
function input() { return { proposal: { id: 'p', enrichment: { auto_publish_description_eligible: true, price_or_stock_changes: false, proposed_changes: { display_title: 'Titre', short_description: 'Court', description: 'Texte', prix_detail: 99, polarity: 'NPN' }, reference_specifications_not_for_publication: [{ tension: 900 }] } }, original: { id: 'p', title: 'Ancien', description: 'Avant' }, current: { id: 'p', active: true, title: 'Ancien', description: 'Avant', priceRevision: 12 } }; }
test('only three documentary fields leave the policy', () => { const r = decide(input()); assert.equal(r.action, 'candidate'); assert.deepEqual(Object.keys(r.text), ['display_title','short_description','description']); });
test('manual protection overrides eligible flag', () => { const x=input();x.document={locked:true};assert.equal(decide(x).reason,'human_protected'); });
test('validated admin text is protected even without explicit lock', () => { const x=input();x.document={status:'valide_admin'};assert.equal(decide(x).reason,'human_protected'); });
test('concurrent text change is a conflict', () => { const x=input();x.current.description='Correction';assert.equal(decide(x).action,'conflict'); });
test('missing publication flag requires classification', () => { const x=input();delete x.proposal.enrichment.auto_publish_description_eligible;assert.equal(decide(x).reason,'classification_required'); });
test('false eligibility preserves public text', () => { const x=input();x.proposal.enrichment.auto_publish_description_eligible=false;assert.equal(decide(x).action,'review'); });
test('inactive or wrong identity cannot be published', () => { const x=input();x.current.active=false;assert.equal(decide(x).action,'review');x.current.id='other';assert.equal(decide(x).action,'conflict'); });
test('invalid text and overlong title rejected', () => { const x=input();x.proposal.enrichment.proposed_changes.description='<script>x</script>';assert.throws(()=>proposedText(x.proposal));x.proposal.enrichment.proposed_changes.display_title='x'.repeat(151);assert.throws(()=>proposedText(x.proposal)); });

test('electrical numbers in prose are held even with eligible flag',()=>{const x=input();x.proposal.enrichment.proposed_changes.description='Tension maximale de 100 V et courant de 2 A.';assert.equal(decide(x).reason,'publication_content_requires_review');});
test('part number suffix does not become a false electrical rating',()=>{const x=input();x.proposal.enrichment.proposed_changes.description='Famille BD246A et BD246C, variante à confirmer.';assert.equal(decide(x).action,'candidate');});
test('interchangeability assertion requires review',()=>{const x=input();x.proposal.enrichment.proposed_changes.description='Ce composant remplace directement la référence voisine.';assert.equal(decide(x).action,'review');});

test('ohm symbol and attached SI units are detected',()=>{const {publicationRisks}=require('./policy.cjs');for(const rating of ['1 MΩ','470µF','12V','0,5 A','100 ohms'])assert.ok(publicationRisks({description:rating}).includes('quantified_electrical_rating'));});
