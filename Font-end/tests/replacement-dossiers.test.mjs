import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeReplacementSuggestions,
  parseEquivalences,
  parseReplacementDossiers,
} from "../src/storefront/equivalenceData.js";

const product = {
  id: "candidate",
  nomProduit: "Pièce synthétique",
  quantiteStock: 2,
  prixPublic: 1000,
  cmupActuel: 999,
};
const decision = {
  verdict: "DIRECT_DOCUMENTE",
  reference: "BC547B",
  application: "Circuit fictif 1 mA",
  justification: "Motif fictif",
  limites: "Usage synthétique uniquement",
  reluLe: "2026-10-13T00:00:00Z",
  source: {
    url: "https://manufacturer.example/fixture.pdf",
    document: "Document synthétique",
    repere: "Page 2",
  },
  reluParId: "private",
};
const response = (d = decision, extra = {}) => ({
  dossiers: [
    { produit: product, decision: d, correspondAuMontage: true, ...extra },
  ],
  nextPage: null,
});
test("No provider payload can promote a suggestion to a human decision", () => {
  const base = parseEquivalences({
    suggestions: [
      { ...product, produitId: product.id, dossiers: [decision], decision },
    ],
  });
  assert.equal(base.suggestions[0].dossiers, undefined);
  assert.equal(base.suggestions[0].decision, undefined);
});
test("A reviewed candidate enters results even if the lexical matcher omitted it", () => {
  const register = parseReplacementDossiers(response(), decision.application);
  const base = parseEquivalences({
    mode: "catalogue",
    suggestions: [
      { produitId: "other", nomProduit: "Autre piste", quantiteStock: 1 },
    ],
  });
  assert.deepEqual(
    mergeReplacementSuggestions(base, register).map((p) => p.produitId),
    ["candidate", "other"],
  );
  assert.equal(register.suggestions[0].dossiers[0].correspondAuMontage, true);
  assert(!JSON.stringify(register).includes("reluParId"));
  assert(!JSON.stringify(register).includes("cmupActuel"));
});
test("Different, unspecified and differently cased circuits never inherit a decision", () => {
  for (const application of ["", "Autre montage", "Circuit fictif 1 MA"])
    assert.equal(
      parseReplacementDossiers(response(), application).suggestions[0]
        .dossiers[0].correspondAuMontage,
      false,
    );
  assert.equal(
    parseReplacementDossiers(response(), " Circuit  fictif 1 mA ")
      .suggestions[0].dossiers[0].correspondAuMontage,
    true,
  );
  assert.equal(
    parseReplacementDossiers(
      response(decision, { correspondAuMontage: false }),
      decision.application,
    ).suggestions[0].dossiers[0].correspondAuMontage,
    false,
  );
});
test("All four verdicts remain distinct and adaptation requirements are kept", () => {
  for (const verdict of [
    "DIRECT_DOCUMENTE",
    "ADAPTATION_NECESSAIRE",
    "REFUSE",
    "A_CONFIRMER",
  ]) {
    const record = parseReplacementDossiers(
      response({
        ...decision,
        verdict,
        adaptations: "Brochage fictif à adapter",
      }),
      decision.application,
    ).suggestions[0].dossiers[0];
    assert.equal(record.verdict, verdict);
    assert.equal(
      record.adaptations,
      verdict === "ADAPTATION_NECESSAIRE" ? "Brochage fictif à adapter" : null,
    );
  }
  assert.equal(
    parseReplacementDossiers(
      response({ ...decision, verdict: "ADAPTATION_NECESSAIRE" }),
      decision.application,
    ).suggestions.length,
    0,
  );
});
test("Missing reviews, unsafe sources, unknown verdicts, unavailable and original products are excluded", () => {
  for (const invalid of [
    { ...decision, reluLe: "" },
    { ...decision, verdict: "100_PERCENT_COMPATIBLE" },
    { ...decision, source: { ...decision.source, url: "javascript:alert(1)" } },
    {
      ...decision,
      source: {
        ...decision.source,
        url: "https://user:pass@manufacturer.example/fixture.pdf",
      },
    },
    { ...decision, limites: "" },
  ])
    assert.equal(
      parseReplacementDossiers(response(invalid), "").suggestions.length,
      0,
    );
  assert.equal(
    parseReplacementDossiers(
      response(decision, { produit: { ...product, quantiteStock: 0 } }),
      "",
    ).suggestions.length,
    0,
  );
  assert.equal(
    parseReplacementDossiers(response(), "", product.id).suggestions.length,
    0,
  );
});
test("Multiple scopes for one piece are retained without duplicate product cards or stale model pricing", () => {
  const register = parseReplacementDossiers(
    {
      dossiers: [
        ...response().dossiers,
        ...response({ ...decision, application: "Autre circuit fictif" })
          .dossiers,
      ],
      nextPage: 1,
    },
    decision.application,
  );
  assert.equal(register.suggestions.length, 1);
  assert.equal(register.suggestions[0].dossiers.length, 2);
  assert.equal(register.nextPage, 1);
  const base = parseEquivalences({
    suggestions: [{ ...product, produitId: product.id, prixPublic: 123 }],
  });
  assert.equal(mergeReplacementSuggestions(base, register)[0].prixPublic, 1000);
  assert.throws(() =>
    parseReplacementDossiers({ dossiers: [], nextPage: "1" }, ""),
  );
  assert.throws(() => parseReplacementDossiers(null, ""));
});
