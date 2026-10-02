import test from "node:test";
import assert from "node:assert/strict";
import { readOffer, readMerchandising } from "../src/storefront/offerData.js";
import { adaptProduct } from "../src/storefront/productData.js";
const p = {
  id: "p",
  nomProduit: "Recette",
  estActif: true,
  prixDetail: 3500,
  prixPublic: 3000,
  quantiteStock: 5,
  offre: { prixCatalogue: 3500, prixOffre: 3000, fin: "2099-01-01T00:00:00Z" },
  arrivageAt: "2026-10-02T10:00:00Z",
};
test("Server offer drives the displayed price, without inferring it from legacy promotional fields", () => {
  const result = adaptProduct(p, () => "");
  assert.equal(result.retailPrice, 3000);
  assert.equal(result.offer.cataloguePrice, 3500);
  assert.equal(
    adaptProduct(
      { ...p, prixPublic: undefined, offre: undefined, prixPromo: 2500 },
      () => "",
    ).retailPrice,
    3500,
  );
  assert.equal(
    adaptProduct({ prixPublic: null, prixDetail: 3500 }, () => "").retailPrice,
    null,
  );
  assert.equal(
    adaptProduct({ prixPublic: true, prixDetail: 3500 }, () => "").retailPrice,
    null,
  );
});
test("Incoherent or unsafe offer data cannot advertise a discount or poison the rendered price", () => {
  for (const o of [
    { prixOffre: 3500 },
    { prixOffre: -1 },
    { prixCatalogue: true },
    { fin: "bad" },
    { prixOffre: "3000" },
  ])
    assert.throws(() => readOffer({ ...p, offre: { ...p.offre, ...o } }));
  assert.throws(() => readOffer({ ...p, prixPublic: 2900 }));
  assert.equal(readOffer({ prixPromo: 3000, finPromo: p.offre.fin }), null);
});
test("Merchandising rows require published active stock and the correct offer/arrival evidence", () => {
  assert.deepEqual(readMerchandising([p], "offres"), [p]);
  assert.deepEqual(readMerchandising([p], "arrivages"), [p]);
  assert.deepEqual(readMerchandising([], "offres"), []);
  for (const changes of [
    { quantiteStock: null },
    { quantiteStock: 0 },
    { estActif: false },
    { nomProduit: {} },
  ])
    assert.throws(() => readMerchandising([{ ...p, ...changes }], "offres"));
  assert.throws(() => readMerchandising([{ ...p, offre: null }], "offres"));
  assert.throws(() =>
    readMerchandising([{ ...p, arrivageAt: null }], "arrivages"),
  );
  assert.throws(() => readMerchandising([p, p], "offres"));
});
