import test from "node:test";
import assert from "node:assert/strict";
import { familySearches } from "../src/storefront/catalogueNavigation.js";
import { cardImage } from "../src/storefront/cardImage.js";

test("Technical sub-family links stay scoped to a real API category and encode search", () => {
  assert.deepEqual(familySearches(null), []);
  assert.deepEqual(familySearches({ key: "components", categories: [] }), []);
  const links = familySearches({ key: "components", categories: [{ id: "actual & family" }] });
  assert.equal(links.length, 6);
  for (const link of links) {
    const url = new URL(link.href, "https://newoteg.com");
    assert.equal(url.searchParams.get("category"), "actual & family");
    assert.ok(url.searchParams.get("search")); assert.ok(link.fr && link.en);
  }
});
test("Responsive photos keep the real catalogue upload and leave unknown hosts unchanged", () => {
  const original = "https://res.cloudinary.com/dm4ij9sxg/image/upload/v1790435856/produits/real.webp";
  const thumbnail = cardImage(original), detail = cardImage(original, [400, 640, 960, 1280]);
  assert.ok(thumbnail.srcSet.includes("240w")); assert.ok(!thumbnail.srcSet.includes("1280w"));
  assert.ok(detail.srcSet.includes("1280w")); assert.ok(detail.srcSet.includes("v1790435856/produits/real.webp"));
  assert.equal(cardImage("https://other.test/photo.jpg"), null);
  assert.equal(cardImage("https://res.cloudinary.com/dm4ij9sxg/image/upload/already_transformed/v1790435856/produits/real.webp"), null);
});
