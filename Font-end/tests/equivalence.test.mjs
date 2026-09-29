import test from "node:test";
import assert from "node:assert/strict";
import { parseEquivalences } from "../src/storefront/equivalenceData.js";
test("Equivalences preserve the service explanation, warning and qualitative level", () => {
  const s = {
    produitId: "a",
    nomProduit: "QA",
    quantiteStock: 3,
    raison: "Service explanation",
    avertissement: "Check pinout",
    compatibilite: "haute",
  };
  const result = parseEquivalences({ suggestions: [s] });
  assert.deepEqual(result.suggestions, [s]);
  assert.equal(result.catalogueOnly, false);
});
test("Missing, duplicate, self and unavailable suggestions are not offered", () => {
  const s = { produitId: "a", nomProduit: "QA", quantiteStock: 3 };
  assert.equal(
    parseEquivalences(
      {
        suggestions: [
          null,
          s,
          s,
          { ...s, produitId: "self" },
          { ...s, produitId: "out", quantiteStock: 0 },
        ],
      },
      "self",
    ).suggestions.length,
    1,
  );
  assert.equal(
    parseEquivalences({ suggestions: [s] }).suggestions[0].compatibilite,
    "inconnue",
  );
  assert.throws(() => parseEquivalences({ message: "Not a results payload" }));
});
test("Catalogue fallback does not become a confirmed technical match", () => {
  const result = parseEquivalences({
    suggestions: [],
    message: "Suggestions catalogue générées sans IA distante.",
  });
  assert.equal(result.catalogueOnly, true);
});
test("Explicit provenance remains catalogue-only even without the French message", () => {
  assert.equal(
    parseEquivalences({
      mode: "catalogue",
      suggestions: [],
      message: "Temporary service interruption",
    }).catalogueOnly,
    true,
  );
  assert.equal(
    parseEquivalences({ mode: "ai", suggestions: [] }).catalogueOnly,
    false,
  );
});
