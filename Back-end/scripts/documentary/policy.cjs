'use strict';
const { createHash } = require('node:crypto');
const fields = Object.freeze(['display_title', 'short_description', 'description']);
function proposedText(proposal) {
  const input = proposal?.enrichment?.proposed_changes;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('INVALID_PROPOSAL');
  const result = {};
  for (const key of fields) {
    if (typeof input[key] !== 'string' || !input[key].trim()) throw Error(`INVALID_${key}`);
    result[key] = input[key];
  }
  if (result.display_title.length > 150) throw Error('TITLE_TOO_LONG');
  if (Object.values(result).some(value => /<\/?[a-z][^>]*>/i.test(value))) throw Error('HTML_NOT_ALLOWED');
  return result;
}
function fingerprint(text) {
  return createHash('sha256').update(JSON.stringify(fields.map(k => text[k] ?? null))).digest('hex');
}
function publicationRisks(text) {
  const reasons = [];
  const body = Object.values(text).join('\n');
  // A letter/digit boundary avoids treating part numbers such as BD246A as ratings.
  const ratings = /(?:^|[^\p{L}\p{N}])\d+(?:[.,]\d+)?\s*(?:(?:[kmunpµμ]?[vafhw])|(?:[kmunpµμ]?(?:ω|ohms?))|(?:[kmg]?hz)|(?:[kmunpµμ]?farads?)|(?:volts?|watts?|ampères?)|(?:°\s*c))(?=$|[^\p{L}\p{N}])/iu;
  if (ratings.test(body)) reasons.push('quantified_electrical_rating');
  if (/\b(?:remplace directement|interchangeable avec|équivalent direct|compatible avec tous|brochage identique)\b/iu.test(body)) reasons.push('unproven_interchangeability_claim');
  return reasons;
}
function decide({ proposal, original, current, document }) {
  const text = proposedText(proposal);
  if (!current || current.id !== proposal.id || original?.id !== proposal.id) return { action: 'conflict', reason: 'identity' };
  if (document?.locked || document?.status === 'valide_admin') return { action: 'review', reason: 'human_protected' };
  if (!current.active) return { action: 'review', reason: 'inactive' };
  if (current.title !== original.title || current.description !== original.description) return { action: 'conflict', reason: 'documentary_content_changed' };
  const eligible = proposal.enrichment.auto_publish_description_eligible;
  if (eligible === undefined) return { action: 'review', reason: 'classification_required' };
  if (typeof eligible !== 'boolean') throw Error('INVALID_ELIGIBILITY');
  if (!eligible) return { action: 'review', reason: 'identification_insuffisante' };
  if (proposal.enrichment.price_or_stock_changes !== false) throw Error('COMMERCIAL_CHANGE_FORBIDDEN');
  const risks = publicationRisks(text);
  if (risks.length) return { action: 'review', reason: 'publication_content_requires_review', risks };
  // This is only a plan. Persistence must enforce an atomic revision check,
  // successful preproduction gates and explicit production authorization.
  return { action: 'candidate', status: 'enrichi_ia_a_verifier', text, fingerprint: fingerprint(text) };
}
module.exports = { fields, proposedText, fingerprint, publicationRisks, decide };
