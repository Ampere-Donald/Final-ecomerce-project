import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_COMPARISON,
  parseComparison,
  toggleComparison,
  comparisonProduct,
  comparisonRows,
} from "../src/storefront/comparisonData.js";

const product = (id, categoryId = "components") => ({ id, categoryId });
test("Selection is bounded, deduplicated and cannot silently change category", () => {
  let selection = EMPTY_COMPARISON;
  for (const id of ["a", "b", "c"])
    selection = toggleComparison(selection, product(id)).selection;
  assert.equal(toggleComparison(selection, product("d")).error, "limit");
  assert.equal(
    toggleComparison(selection, product("d", "tools")).error,
    "family",
  );
  assert.strictEqual(
    toggleComparison(selection, product("d")).selection,
    selection,
  );
  selection = toggleComparison(selection, product("a", "changed")).selection;
  assert.deepEqual(selection.ids, ["b", "c"]);
  selection = toggleComparison(selection, product("b")).selection;
  assert.strictEqual(
    toggleComparison(selection, product("c")).selection,
    EMPTY_COMPARISON,
  );
  assert.equal(
    toggleComparison(EMPTY_COMPARISON, product("unknown", "")).error,
    "unknown",
  );
});
test("Only valid IDs and category are restored; corrupt or oversized selection fails closed", () => {
  const valid = {
    schema: 1,
    ids: ["a", "b"],
    categoryId: "components",
    phone: "private",
    price: 100,
  };
  assert.deepEqual(parseComparison(JSON.stringify(valid)), {
    ids: ["a", "b"],
    categoryId: "components",
  });
  for (const value of [
    null,
    "{",
    JSON.stringify({ ...valid, schema: 2 }),
    JSON.stringify({ ...valid, ids: ["a", "a"] }),
    JSON.stringify({ ...valid, ids: ["a", "b", "c", "d"] }),
    JSON.stringify({ ...valid, ids: ["../../private"] }),
    JSON.stringify({ ...valid, categoryId: "" }),
  ])
    assert.strictEqual(parseComparison(value), EMPTY_COMPARISON);
});
const raw = {
  id: "a",
  estActif: true,
  categorieId: "components",
  code: "STM32F103C8T6-TR",
  nomProduit: "Pièce de recette",
  prixDetail: 100,
  quantiteStock: 0,
  attributs: [{ nomAttribut: "Tension", valeurs: [{ valeur: "3.3 V" }] }],
  cmupActuel: 10,
  dernierFournisseurId: "private",
};
test("A current product must match ID, active state and chosen category; private fields are omitted", () => {
  const result = comparisonProduct(raw, "a", "components", () => "");
  assert.equal(result.product.reference, "STM32F103C8T6-TR");
  assert.equal(result.product.stock, 0);
  assert.equal(result.product.cmupActuel, undefined);
  assert.equal(result.product.dernierFournisseurId, undefined);
  assert.equal(
    comparisonProduct(raw, "b", "components", () => "").error,
    "unavailable",
  );
  assert.equal(
    comparisonProduct({ ...raw, estActif: false }, "a", "components", () => "")
      .error,
    "unavailable",
  );
  assert.equal(
    comparisonProduct(
      { ...raw, categorieId: "tools" },
      "a",
      "components",
      () => "",
    ).error,
    "family",
  );
  assert.equal(
    comparisonProduct(
      { ...raw, attributs: [{ nomAttribut: "Tension", valeurs: "bad" }] },
      "a",
      "components",
      () => "",
    ).error,
    "invalid",
  );
});
test("Unknown technical values are not differences; zero and exact units are preserved", () => {
  const rows = comparisonRows([
    {
      attributes: [
        ["Tension", "3.3 V"],
        ["Broches", "0"],
        ["Boîtier", "LQFP48"],
        ["Courant", "1 A"],
      ],
    },
    {
      attributes: [
        ["Tension", "5 V"],
        ["Broches", "0"],
        ["Boîtier", "LQFP48"],
        ["courant", "1000 mA"],
      ],
    },
  ]);
  assert.equal(rows.find((r) => r.label === "Tension").different, true);
  assert.equal(rows.find((r) => r.label === "Broches").different, false);
  assert.deepEqual(rows.find((r) => r.label === "Broches").values, ["0", "0"]);
  assert.deepEqual(rows.find((r) => r.label === "Courant").values, [
    "1 A",
    null,
  ]);
  assert.equal(rows.find((r) => r.label === "Courant").incomplete, true);
  assert.equal(rows.find((r) => r.label === "Courant").different, false);
  assert.equal(rows.find((r) => r.label === "courant").different, false);
});
