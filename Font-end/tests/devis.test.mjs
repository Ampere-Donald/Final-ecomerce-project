import test from "node:test";
import assert from "node:assert/strict";
import {
  parseReferenceList,
  resolvedReferenceList,
  requestViewValid,
  readDevisAttempt,
} from "../src/storefront/devisData.js";

test("reference import preserves suffixes and duplicates, accepts spreadsheet columns and defaults only omitted quantities", () => {
  assert.deepEqual(
    parseReferenceList(
      " LM358-N; 20\nCâble HDMI\nSTM32F103C8T6\t2\nLM358-N; 3",
    ),
    [
      { reference: "LM358-N", quantite: 20 },
      { reference: "Câble HDMI", quantite: 1 },
      { reference: "STM32F103C8T6", quantite: 2 },
      { reference: "LM358-N", quantite: 3 },
    ],
  );
});

test("an unreadable pending attempt blocks creating a fresh one without exposing a different owner", () => {
  const original = globalThis.sessionStorage;
  try {
    globalThis.sessionStorage = { getItem: () => "{broken" };
    assert.equal(readDevisAttempt("key", "owner").blocked, true);
    globalThis.sessionStorage = {
      getItem: () =>
        JSON.stringify({ ownerId: "other", payload: { lignes: [] } }),
    };
    assert.deepEqual(readDevisAttempt("key", "owner"), {
      attempt: null,
      blocked: false,
    });
    globalThis.sessionStorage = {
      getItem: () => JSON.stringify({ ownerId: "owner", payload: {} }),
    };
    assert.equal(readDevisAttempt("key", "owner").blocked, true);
  } finally {
    globalThis.sessionStorage = original;
  }
});
test("invalid imports fail as a whole rather than silently truncating or altering quantities", () => {
  for (const value of [
    "",
    "a; 0",
    "a; -1",
    "a; 1.2",
    "a; 100001",
    "a;",
    "a;2;3",
    ";2",
    "x".repeat(101),
    Array(51).fill("a;1").join("\n"),
  ])
    assert.throws(() => parseReferenceList(value));
});
test("even an exact candidate requires explicit selection; mismatched resolver output is refused", () => {
  const input = [{ reference: "LM358-N", quantite: 2 }];
  const response = {
    lignes: [
      {
        ...input[0],
        match: "exact",
        candidates: [{ id: "p", nomProduit: "LM358-N" }],
      },
    ],
  };
  assert.equal(resolvedReferenceList(response, input)[0].produitId, "");
  assert.throws(() =>
    resolvedReferenceList(
      { lignes: [{ ...response.lignes[0], reference: "LM358" }] },
      input,
    ),
  );
  assert.throws(() => resolvedReferenceList({ lignes: [] }, input));
  assert.equal(
    requestViewValid({ id: "d", version: 2, statut: "RECUE", lignes: input }),
    true,
  );
  assert.equal(
    requestViewValid({ id: "d", version: 2, statut: "RECUE", lignes: [] }),
    false,
  );
});
