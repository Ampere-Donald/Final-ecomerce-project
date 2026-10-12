import { simpleQuantityKey } from "./technicalUnits.js";

// Route-only table logic: keep conversions out of the initial home bundle.
// Preserve source labels/values. Missing values never prove equality or a difference.
export function comparisonRows(products, lang = "fr") {
  const headings = new Map();
  const columns = products.map((product) => {
    const map = new Map();
    const attributes = product.technicalAttributes
      ? product.technicalAttributes.map((a) => ({
          label: a.label,
          value: a.values.map((v) => v.value).join(", "),
          technicalKey: a.technicalKey,
          dictionaryLabel: a.technicalLabels?.[lang === "en" ? "en" : "fr"],
        }))
      : (product.attributes || []).map(([label, value]) => ({ label, value }));
    for (const { label, value, technicalKey, dictionaryLabel } of attributes) {
      const title = label.trim(),
        text = String(value).trim();
      if (!title || !text) continue;
      // Explicit semantic key wins over translated/commercial labels. Untyped
      // legacy fields stay separate; never infer input/output or maximum/nominal.
      const key = technicalKey ? `technical:${technicalKey}` : `label:${title}`;
      if (!headings.has(key))
        headings.set(key, {
          label:
            technicalKey && dictionaryLabel?.trim()
              ? dictionaryLabel.trim()
              : title,
          technicalKey,
        });
      map.set(key, [...new Set([...(map.get(key) || []), text])]);
    }
    return map;
  });
  const keys = [...new Set(columns.flatMap((column) => [...column.keys()]))];
  return keys.map((key) => {
    const { label, technicalKey } = headings.get(key);
    const values = columns.map(
      (column) => column.get(key)?.join(" ; ") || null,
    );
    const complete = values.every((value) => value !== null);
    const quantities = complete ? values.map(simpleQuantityKey) : [];
    const sameQuantity =
      complete &&
      quantities.every((value) => value !== null) &&
      new Set(quantities).size === 1;
    const textDiffers = new Set(values).size > 1;
    return {
      label,
      values,
      incomplete: !complete,
      ...(technicalKey ? { technicalKey } : {}),
      different: complete && textDiffers && !sameQuantity,
      unitEquivalent: sameQuantity && textDiffers,
    };
  });
}
