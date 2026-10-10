const states = new Set(['INCONNU', 'A_VERIFIER', 'DOCUMENTE', 'CONTRADICTOIRE', 'NON_APPLICABLE']);
const text = value => typeof value === 'string' ? value : null;
export function readTechnicalSource(source) {
  if (!source || source.obsolete) return { etat: 'A_VERIFIER', obsolete: Boolean(source?.obsolete) };
  let etat = states.has(source.etat) ? source.etat : 'A_VERIFIER';
  const reluLe = typeof source.reluLe === 'string' && Number.isFinite(Date.parse(source.reluLe)) ? source.reluLe : null;
  if (etat === 'DOCUMENTE' && !reluLe) etat = 'A_VERIFIER';
  let sourceUrl = null;
  try { const url = new URL(source.sourceUrl); if (url.protocol === 'https:' && !url.username && !url.password) sourceUrl = url.href; } catch { /* A missing/invalid source never becomes a link. */ }
  return {
    etat, obsolete: false, sourceUrl, reluLe: etat === 'DOCUMENTE' ? reluLe : null,
    ...Object.fromEntries(['uniteSource', 'valeurNormalisee', 'uniteNormalisee', 'conditions', 'sourceDocument', 'sourceRepere', 'sourceRevision', 'motif'].map(key => [key, text(source[key])])),
  };
}
export function technicalAttributes(attributes) {
  return (attributes || []).filter(a => typeof a.nomAttribut === 'string' && a.nomAttribut.trim()).map(a => ({
    label: a.nomAttribut,
    values: (a.valeurs || []).filter(v => v.valeur !== null && v.valeur !== undefined && String(v.valeur).trim()).map(v => ({
      value: String(v.valeur), source: readTechnicalSource(v.documentation),
    })),
  })).filter(a => a.values.length);
}
