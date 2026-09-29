import test from "node:test";
import assert from "node:assert/strict";
import {
  validQuote,
  safeReturnTo,
  orderState,
  orderDate,
} from "../src/storefront/orderData.js";
test("quote binds catalogue price and total to every requested ID and quantity", () => {
  const items = [{ id: "p1", quantity: 2 }];
  const quote = {
    montantArticles: 7000,
    lignes: [
      { produitId: "p1", quantite: 2, nomProduit: "Item", prixUnitaire: 3500 },
    ],
  };
  assert(validQuote(quote, items));
  assert(!validQuote({ ...quote, montantArticles: 1 }, items));
  assert(!validQuote(quote, [{ id: "other", quantity: 2 }]));
  assert(!validQuote(quote, [{ id: "p1", quantity: 1 }]));
  assert(!validQuote({ commande: {} }, items));
});
test("return URL is internal and unknown order states do not imply completion", () => {
  for (const bad of [
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\nexample.com",
  ])
    assert.equal(safeReturnTo(bad), "/profile");
  assert.equal(safeReturnTo("/checkout"), "/checkout");
  assert.equal(orderState("NEW_STATE").tone, "pending");
  assert.equal(orderDate(null), "Date non renseignée");
});
