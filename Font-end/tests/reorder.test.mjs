import test from "node:test";
import assert from "node:assert/strict";
import {
  reorderLines,
  readReorderProducts,
  prepareReorder,
  reorderChanged,
} from "../src/storefront/reorderData.js";
import { cartReducer } from "../src/storefront/cartState.js";
const raw = (id, values = {}) => ({
  id,
  nomProduit: id,
  estActif: true,
  prixDetail: 4000,
  quantiteStock: 3,
  ...values,
});
const line = (id, quantity = 4) => ({
  produitId: id,
  nomProduit: id,
  quantite: quantity,
  prixUnitaire: 3500,
});

test("Reorder reads live prices and caps additions against current cart; missing references remain visible", () => {
  const lines = reorderLines([
    line("a", 2),
    line("a", 2),
    line(null),
    line("out"),
    line("archived"),
    line("unknown"),
  ]);
  const products = new Map([
    ["a", { raw: raw("a") }],
    ["out", { raw: raw("out", { quantiteStock: 0 }) }],
    ["archived", { raw: raw("archived", { estActif: false }) }],
    ["unknown", { raw: raw("unknown", { prixDetail: null }) }],
  ]);
  const rows = prepareReorder(
    lines,
    products,
    [{ id: "a", quantity: 1 }],
    (url) => url,
  );
  assert.equal(rows[0].requested, 4);
  assert.equal(rows[0].quantity, 2);
  assert.equal(rows[0].product.retailPrice, 4000);
  assert.equal(rows[0].priceChanged, true);
  assert.deepEqual(
    rows.slice(1).map((row) => row.reason),
    ["missing", "out", "missing", "price"],
  );
});

test("Network errors do not declare a reference removed; detail responses must match the requested ID", async () => {
  const lines = reorderLines([line("missing"), line("network"), line("wrong")]);
  const results = await readReorderProducts(lines, async (id) => {
    if (id === "missing") throw { response: { status: 404 } };
    if (id === "network") throw { response: { status: 503 } };
    return raw("someone-else");
  });
  assert.equal(results.get("missing").error, "missing");
  assert.equal(results.get("network").error, "unverified");
  assert.equal(results.get("wrong").error, "unverified");
});

test("A changed price, depleted stock or changed cart forces renewed acceptance of selected rows", () => {
  const lines = reorderLines([line("a")]);
  const previous = prepareReorder(
    lines,
    new Map([["a", { raw: raw("a") }]]),
    [],
    (url) => url,
  );
  for (const [values, cart] of [
    [{ prixDetail: 4500 }, []],
    [{ quantiteStock: 1 }, []],
    [{}, [{ id: "a", quantity: 3 }]],
  ]) {
    const current = prepareReorder(
      lines,
      new Map([["a", { raw: raw("a", values) }]]),
      cart,
      (url) => url,
    );
    assert.equal(reorderChanged(previous, current, { a: 2 }), true);
    assert.equal(reorderChanged(previous, current, { a: 0 }), false);
  }
});

test("Batch addition is all-or-nothing and never silently clips an accepted quantity", () => {
  const product = { id: "a", code: "a", stock: 3, retailPrice: 4000 };
  const state = [{ ...product, quantity: 1, retailPrice: 3500 }];
  const selection = [
    { product, quantity: 2 },
    { product: { ...product, id: "b", code: "b" }, quantity: 1 },
  ];
  const next = cartReducer(state, {
    type: "ADD_SELECTION",
    payload: selection,
  });
  assert.equal(next[0].quantity, 3);
  assert.equal(next[0].retailPrice, 4000);
  assert.equal(next.length, 2);
  assert.equal(
    cartReducer(state, {
      type: "ADD_SELECTION",
      payload: [{ product, quantity: 4 }, selection[1]],
    }),
    state,
  );
  assert.equal(
    cartReducer(state, {
      type: "ADD_SELECTION",
      payload: [
        { product, quantity: 1 },
        { product, quantity: 1 },
      ],
    }),
    state,
  );
});
