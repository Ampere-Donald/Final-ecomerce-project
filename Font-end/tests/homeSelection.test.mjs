import test from "node:test";
import assert from "node:assert/strict";
import { selectionPaths, selectionRows, selectionAction, selectionPrice } from "../src/storefront/homeSelectionData.js";
import { adaptProduct } from "../src/storefront/productData.js";
const raw = (id) => ({ id, nomProduit: "Part " + id, estActif: true });
test("Home selection caps combined API results at five and removes duplicates", () => {
  assert.equal(selectionRows([[raw("a"), raw("a")], { data: Array.from({ length: 8 }, (_, i) => raw(String(i))) }]).length, 5);
  assert.deepEqual(selectionRows([[]]), []);
  assert.throws(() => selectionRows([{ message: "bad" }]));
  assert.throws(() => selectionRows([[{ ...raw("a"), estActif: false }]]));
});
test("Home filters resolve catalogue category IDs instead of keyword search", () => {
  const cats = [{ id: "wires", nom: "Câbles & Connectique" }, { id: "energy", nom: "Alimentation & Energie" }, { id: "chargers", nom: "Chargeurs & Power Banks" }, { id: "battery", nom: "Piles & Batteries" }, { id: "meter", nom: "Mesure & Test" }, { id: "tools", nom: "Outillage" }, { id: "parts", nom: "Composants Électroniques" }];
  assert.deepEqual(selectionPaths("", null), ["/produits/populaires"]);
  for (const [filter, ids] of [["connect", ["wires"]], ["power", ["energy", "chargers", "battery"]], ["tools", ["meter", "tools"]], ["repair", ["parts"]]]) {
    assert.deepEqual(selectionPaths(filter, cats).map(p => new URL(p, "https://test").searchParams.get("categoryId")), ids);
  }
  assert.deepEqual(selectionPaths("repair", []), []);
  assert.throws(() => selectionPaths("unrecognized", cats));
});
test("Product CTA opens detail; only real out-of-stock pre-fills equivalents", () => {
  for (const stock of [10, 2, null, undefined]) assert.deepEqual(selectionAction({ id: "part", stock }), { equivalent: false, to: "/product/part" });
  const action = selectionAction({ id: "part", stock: 0, reference: "A&B/32", model: "Part" });
  const u = new URL(action.to, "https://test");
  assert.equal(action.equivalent, true);
  assert.equal(u.pathname, "/equivalences");
  assert.equal(u.searchParams.get("query"), "A&B/32");
  assert.equal(u.searchParams.get("produitId"), "part");
});
test("Home price has no manufactured fallback and preserves validated public offer", () => {
  for (const retailPrice of [null, undefined, 0, -1, Infinity, NaN, "bad"]) assert.equal(selectionPrice({ retailPrice }), null);
  const product = adaptProduct({ ...raw("sale"), prixPublic: 2900, offre: { prixCatalogue: 3400, prixOffre: 2900, fin: "2099-01-01T00:00:00Z" } }, () => "");
  assert.equal(selectionPrice(product), 2900);
  assert.equal(product.offer.cataloguePrice, 3400);
  assert.equal(selectionPrice(product, Date.parse("2099-01-01T00:00:01Z")), null);
  assert.equal(adaptProduct({ ...raw("unknown"), prixPublic: null, prixDetail: 3000 }, () => "").retailPrice, null);
});
