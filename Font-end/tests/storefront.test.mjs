import test from "node:test";
import assert from "node:assert/strict";
import {
  adaptProduct,
  stockState,
  canBuy,
  resultPage,
} from "../src/storefront/productData.js";
import { cartReducer, hydrateCart } from "../src/storefront/cartState.js";

test("Missing stock is distinct from zero, and unavailable prices cannot be purchased", () => {
  for (const value of [null, undefined, "", "invalid"])
    assert.equal(stockState({ stock: value }), "unknown");
  assert.equal(stockState({ stock: 0 }), "out");
  for (const stock of [null, 0, -1])
    assert.equal(canBuy({ stock, retailPrice: 2500 }), false);
  for (const retailPrice of [null, 0, -1, "invalid"])
    assert.equal(canBuy({ stock: 5, retailPrice }), false);
  assert.equal(canBuy({ stock: 10, retailPrice: 2500 }), true);
});
test("API adaptation preserves identifiers and nullable volume conditions", () => {
  assert.equal(adaptProduct({ id: 'test', prixDetail: 3500, prixPublic: 3000 }, () => '').retailPrice, 3000);
  assert.equal(adaptProduct({ id: 'test', prixDetail: 3500, prixPublic: null }, () => '').retailPrice, null);
  const p = adaptProduct(
    {
      id: "full-uuid",
      code: "REF",
      prixDetail: "2500",
      prixGros: "2000",
      quantiteStock: 6,
      imageUrl: "/one",
      imageUrl2: "/one",
      urlDatasheet: "javascript:void(0)",
    },
    (v) => v,
  );
  assert.equal(p.retailPrice, 2500);
  assert.equal(p.stock, 6);
  assert.equal(p.reference, "REF");
  assert.equal(p.code, "full-uuid");
  assert.equal(p.wholesaleMinimum, null);
  assert.equal(p.urlDatasheet, null);
  assert.deepEqual(p.images, ["/one"]);
  assert.throws(() => resultPage({ message: "error" }));
  assert.deepEqual(resultPage({ data: [], meta: { total: 0, lastPage: 0 } }), {
    rows: [],
    total: 0,
    pages: 1,
  });
});
test("Cart merges legacy and new identities without exceeding latest stock", () => {
  const legacy = {
    id: "full-uuid",
    code: "FULL",
    model: "Test",
    retailPrice: 2500,
    quantity: 2,
  };
  const product = { ...legacy, code: "full-uuid", stock: 3, reference: "REF" };
  const next = cartReducer([legacy], {
    type: "ADD_ITEM",
    payload: { product, quantity: 4 },
  });
  assert.equal(next.length, 1);
  assert.equal(next[0].quantity, 3);
  assert.equal(next[0].code, "FULL");
  assert.equal(next[0].reference, "REF");
  assert.equal(
    cartReducer(next, {
      type: "UPDATE_QUANTITY",
      payload: { code: "FULL", quantity: 500 },
    })[0].quantity,
    3,
  );
  assert.deepEqual(
    cartReducer(next, {
      type: "UPDATE_QUANTITY",
      payload: { code: "FULL", quantity: 0 },
    }),
    [],
  );
  assert.deepEqual(
    cartReducer([], {
      type: "ADD_ITEM",
      payload: { product: { ...product, stock: 0 }, quantity: 1 },
    }),
    [],
  );
});
test("Malformed persisted entries cannot poison cart totals", () => {
  assert.deepEqual(hydrateCart({}), []);
  const row = { id: "1", code: "1", retailPrice: "2500", quantity: "2" };
  const clean = hydrateCart([
    null,
    {},
    row,
    { ...row, quantity: "oops" },
    { ...row, retailPrice: null },
  ]);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].quantity * clean[0].retailPrice, 5000);
});
