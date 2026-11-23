export function groupChoices(rows, choices, groups) {
  if (!Number.isSafeInteger(groups) || groups < 1 || groups > 1000)
    throw Error("Invalid group count");
  const next = { ...choices };
  for (const row of rows) {
    const quantity = row.quantite * groups;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000)
      throw Error("Group quantity exceeds limit");
    next[row.id] = {
      ...choices[row.id],
      selected: choices[row.id]?.selected ?? row.necessaire,
      quantity: String(quantity),
    };
  }
  return next;
}
// Only public references and requested quantities, never price/stock/contact data.
export function projectQuoteText(rows, choices, includeRequired = false) {
  const selected = rows.filter(
    (row) => choices[row.id]?.selected || (includeRequired && row.necessaire),
  );
  if (
    !selected.length ||
    selected.some(
      (row) =>
        !row.product?.reference ||
        /[;\r\n]/.test(row.product.reference) ||
        !/^\d+$/.test(String(choices[row.id]?.quantity)) ||
        Number(choices[row.id].quantity) < 1 ||
        Number(choices[row.id].quantity) > 10000,
    )
  )
    return "";
  return selected
    .map((row) => `${row.product.reference}; ${choices[row.id].quantity}`)
    .join("\n");
}
