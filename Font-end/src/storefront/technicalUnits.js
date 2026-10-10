// Exact decimal scaling for explicitly written, simple SI quantities only.
// Source text stays untouched; matching quantities do not establish replacement compatibility.
// Prefix factors: https://www.bipm.org/en/measurement-units/si-prefixes
const prefixes = {
  '': 0, p: -12, n: -9, 'µ': -6, 'μ': -6, u: -6,
  m: -3, c: -2, d: -1, k: 3, M: 6, G: 9, T: 12,
};

export function simpleQuantityKey(value) {
  if (typeof value !== 'string' || value.length > 100) return null;
  // Commas, ranges, tolerances, conditions, compound units and undocumented units
  // are intentionally left literal. No locale, unit or rating is inferred.
  const match = value.trim().match(/^([+-]?)(\d+(?:\.\d+)?|\.\d+)(?:[eE]([+-]?\d{1,2}))?\s*([^\s]+)$/);
  if (!match) return null;
  const unit = match[4].match(/^(p|n|µ|μ|u|m|c|d|k|M|G|T)?(V|A|Ω|W|F|H|Hz|m|s)$/);
  const power = Number(match[3] || 0);
  if (!unit || Math.abs(power) > 24) return null;
  const [integer, fraction = ''] = match[2].split('.');
  let digits = (integer + fraction).replace(/^0+/, '');
  if (digits.length > 32) return null;
  if (!digits) return unit[2] + ':0';
  let exponent = prefixes[unit[1] || ''] + power - fraction.length;
  while (digits.endsWith('0')) {
    digits = digits.slice(0, -1);
    exponent++;
  }
  // Compare decimal strings, not rounded IEEE-754 values or unsupported BigInts.
  return unit[2] + ':' + (match[1] === '-' ? '-' : '') + digits + 'e' + exponent;
}
