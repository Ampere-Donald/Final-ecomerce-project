import { simpleQuantityKey } from './technicalUnits.js';

// Route-only table logic: keep conversions out of the initial home bundle.
// Preserve source labels/values. Missing values never prove equality or a difference.
export function comparisonRows(products) {
  const columns = products.map((product) => {
    const map = new Map();
    for (const [label, value] of product.attributes || []) {
      const key = label.trim(), text = String(value).trim();
      if (!key || !text) continue;
      map.set(key, [...new Set([...(map.get(key) || []), text])]);
    }
    return map;
  });
  const labels = [...new Set(columns.flatMap((column) => [...column.keys()]))];
  return labels.map((label) => {
    const values = columns.map(column => column.get(label)?.join(' ; ') || null);
    const complete = values.every(value => value !== null);
    const quantities = complete ? values.map(simpleQuantityKey) : [];
    const sameQuantity = complete && quantities.every(value => value !== null) &&
      new Set(quantities).size === 1;
    const textDiffers = new Set(values).size > 1;
    return {
      label, values, incomplete: !complete,
      different: complete && textDiffers && !sameQuantity,
      unitEquivalent: sameQuantity && textDiffers,
    };
  });
}
