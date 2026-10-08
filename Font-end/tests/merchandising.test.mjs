import test from "node:test";
import assert from "node:assert/strict";
import { homeCollections, collectionPaths, collectionLink, selectCollection } from "../src/storefront/merchandisingData.js";
const names = [...new Set(homeCollections.flatMap(c => c.sources.map(s => s.category)))];
const categories = names.map((nom, i) => ({ id: `cat-${i}`, nom }));
const product = (id, extra = {}) => ({ id, nomProduit: id, estActif: true, prixPublic: 1000, quantiteStock: 8, imageUrl: "/real.webp", ...extra });
test("Six editorial shelves resolve real category IDs with bounded server queries and bilingual content", () => {
  assert.equal(homeCollections.length, 6);
  assert.equal(new Set(homeCollections.map(c => c.id)).size, 6);
  for (const config of homeCollections) {
    assert.ok(config.title.every(Boolean) && config.description.every(Boolean));
    for (const path of collectionPaths(config, categories)) {
      const url = new URL(path, "https://test");
      assert.equal(url.pathname, "/produits");
      assert.ok(categories.some(c => c.id === url.searchParams.get("categoryId")));
      assert.ok(Number(url.searchParams.get("limit")) <= 20);
      assert.equal(url.searchParams.get("page"), "1");
      assert.equal(url.searchParams.get("inStock"), "true");
    }
    const link = new URL(collectionLink(config, categories), "https://test");
    assert.equal(link.pathname, "/catalogue");
    assert.ok(link.searchParams.has("category") || link.searchParams.has("search"));
    assert.deepEqual(collectionPaths(config, []), []);
  }
});
test("Collections remain bounded, stable, diverse, active, sellable and deduplicated", () => {
  const a = Array.from({ length: 20 }, (_, i) => product(`a-${i}`));
  const b = Array.from({ length: 20 }, (_, i) => product(`b-${i}`));
  const input = [a, { data: [a[0], ...b, product("off", { estActif: false }), product("out", { quantiteStock: 0 })] }];
  const selected = selectCollection(input, v => v);
  assert.equal(selected.length, 20);
  assert.equal(new Set(selected.map(p => p.id)).size, 20);
  assert.ok(selected.slice(0, 5).some(p => p.id.startsWith("a")) && selected.slice(0, 5).some(p => p.id.startsWith("b")));
  assert.ok(!selected.some(p => ["off", "out"].includes(p.id)));
  assert.deepEqual(selected, selectCollection(input, v => v));
});
test("Complete references take priority; partial/empty collections never invent data", () => {
  const complete = Array.from({ length: 6 }, (_, i) => product(`complete-${i}`));
  const unknown = product("unknown", { prixPublic: null });
  const noImage = product("no-image", { imageUrl: null });
  assert.equal(selectCollection([[unknown, noImage, ...complete]], v => v || "").length, 6);
  const partial = selectCollection([[unknown, noImage]], v => v || "");
  assert.equal(partial.length, 2);
  assert.equal(partial.find(p => p.id === "unknown").retailPrice, null);
  assert.equal(partial.find(p => p.id === "no-image").image, "");
  const mixed = selectCollection([[unknown, complete[0]], [noImage]], v => v || "");
  assert.equal(mixed[0].id, complete[0].id);
  assert.deepEqual(selectCollection([], v => v), []);
  assert.deepEqual(selectCollection([[]], v => v), []);
  assert.throws(() => selectCollection([{ message: "bad" }], v => v));
});
