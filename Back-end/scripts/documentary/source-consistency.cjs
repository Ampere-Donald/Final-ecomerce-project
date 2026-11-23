'use strict';
// Reject known semantic contradictions before reusing catalogue/proposal prose.
// This is a conservative gate, not a certification of any remaining claim.
function sourceConsistencyRisks(product, value) {
  const title = product?.original?.title || '';
  const text = String(value || '').replace(/[^.!?]*(?:précédent|ancien)[^.!?]*(?:écart[ée]|ne sont pas retenu)[^.!?]*[.!?]/gi, '');
  const risks = [];
  if (/optocoupl|\b(?:CNX|CNY|MOC)\s?\d/i.test(title) && /mixeur|blender|bol et moteur|transmission entre bol|à fourche/i.test(text))
    risks.push('OPTOCOUPLER_MECHANICAL_DESCRIPTION');
  if (/\brj45\b/i.test(title) && /mixeur|blender|bol et moteur|transmission entre bol/i.test(text))
    risks.push('NETWORK_COUPLER_MECHANICAL_DESCRIPTION');
  if (/servomoteur|servo.?motor|\b(?:MG90S|SG90)\b/i.test(title) && /engrenage plastique de mécanisme|simple engrenage|kit de pignons/i.test(text))
    risks.push('SERVO_DESCRIBED_AS_PASSIVE_GEAR');
  return risks;
}
module.exports = { sourceConsistencyRisks };
