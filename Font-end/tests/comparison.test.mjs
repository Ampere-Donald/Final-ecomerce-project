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

test("Explicit dictionary keys join translated labels and preserve sources per product", () => {
  const products = ["Boîtier", "Package"].map(
    (label, index) =>
      comparisonProduct(
        {
          ...raw,
          id: index ? "b" : "a",
          attributs: [
            {
              nomAttribut: label,
              cleTechnique: "BOITIER",
              valeurs: [{ valeur: "TO-92" }],
            },
          ],
        },
        index ? "b" : "a",
        "components",
        () => "",
      ).product,
  );
  const rows = comparisonRows(products);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].technicalKey, "BOITIER");
  assert.deepEqual(rows[0].values, ["TO-92", "TO-92"]);
  assert.equal(rows[0].different, false);
  assert.equal(products[1].technicalAttributes[0].label, "Package");
});

test("Input/output roles never merge even with the same label or quantity; untyped legacy fields stay separate", () => {
  const make = (attributes) => ({
    technicalAttributes: attributes.map(([label, technicalKey, value]) => ({
      label,
      ...(technicalKey ? { technicalKey } : {}),
      values: [{ value }],
    })),
  });
  const rows = comparisonRows([
    make([
      ["Tension", "ALIMENTATION_ENTREE_PLAGE", "12 V"],
      ["Boîtier", null, "TO-92"],
    ]),
    make([
      ["Tension", "ALIMENTATION_SORTIE_TENSION", "12 V"],
      ["Boîtier", "BOITIER", "TO-92"],
    ]),
  ]);
  assert.equal(rows.length, 4);
  assert(
    rows.every(
      (row) => row.incomplete && !row.different && !row.unitEquivalent,
    ),
  );
});

test("Dictionary keys retain unit comparison without losing zero or inventing values", () => {
  const rows = comparisonRows([
    {
      technicalAttributes: [
        {
          label: "Sortie",
          technicalKey: "ALIMENTATION_SORTIE_COURANT",
          values: [{ value: "1 A" }],
        },
      ],
    },
    {
      technicalAttributes: [
        {
          label: "Output current",
          technicalKey: "ALIMENTATION_SORTIE_COURANT",
          values: [{ value: "1000 mA" }],
        },
      ],
    },
  ]);
  assert.equal(rows[0].unitEquivalent, true);
  assert.equal(rows[0].different, false);
  assert.deepEqual(rows[0].values, ["1 A", "1000 mA"]);
});

test("Canonical labels are translated and distinguish roles while original labels remain available on the product", () => {
  const products = [
    comparisonProduct(
      {
        ...raw,
        attributs: [
          {
            nomAttribut: "Tension",
            cleTechnique: "ALIMENTATION_SORTIE_TENSION",
            libelleTechnique: { fr: "Tension de sortie", en: "Output voltage" },
            valeurs: [{ valeur: "12 V" }],
          },
        ],
      },
      "a",
      "components",
      () => "",
    ).product,
  ];
  assert.equal(comparisonRows(products)[0].label, "Tension de sortie");
  assert.equal(comparisonRows(products, "en")[0].label, "Output voltage");
  assert.equal(products[0].technicalAttributes[0].label, "Tension");
});
