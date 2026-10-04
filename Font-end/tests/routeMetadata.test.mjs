import test from "node:test";
import assert from "node:assert/strict";
import {
  pageMetadata,
  isPrivateDocument,
} from "../src/storefront/routeMetadata.js";

test("Private document boundaries, language and nested routes stay non-indexable", () => {
  for (const path of [
    "/panier",
    "/checkout/",
    "/Suivi-invite",
    "/mes-devis/id/imprimer",
    "/commandes/id",
    "/profile",
    "/favourites",
    "/login",
    "/signup",
    "/forgot-password",
  ]) {
    assert(isPrivateDocument(path));
    for (const lang of ["fr", "en"]) {
      const meta = pageMetadata(path, "?page=2", lang);
      assert.equal(meta.robots, "noindex, nofollow");
      assert.equal(meta.canonical, null);
      assert.equal(meta.private, true);
      assert(meta.title.endsWith(" — X-Electronic"));
    }
  }
  assert.equal(isPrivateDocument("/suivi-invite-extra"), false);
});

test("Filtered results, pagination and unavailable route have distinct indexing rules", () => {
  for (const search of [
    "?search=capteur",
    "?marque=id",
    "?page=2&search=capteur",
  ]) {
    const meta = pageMetadata("/catalogue", search);
    assert.equal(meta.robots, "noindex, follow");
    assert.equal(meta.canonical, "https://newoteg.com/catalogue");
  }
  assert.equal(
    pageMetadata("/catalogue", "?page=2").canonical,
    "https://newoteg.com/catalogue?page=2",
  );
  assert.equal(pageMetadata("/catalogue", "?page=2").robots, "index, follow");
  assert.equal(
    pageMetadata("/equivalences", "?reference=x").robots,
    "noindex, follow",
  );
  for (const path of ["/comparer", "/unknown-route"]) {
    assert.equal(pageMetadata(path).canonical, null);
    assert.equal(pageMetadata(path).robots, "noindex, follow");
  }
  assert.equal(
    pageMetadata("/livraison", "", "en").title,
    "Delivery and pickup — X-Electronic",
  );
  assert.match(
    pageMetadata("/livraison").description,
    /frais et délai à confirmer/,
  );
});
