import test from "node:test";
import assert from "node:assert/strict";
import {
  readAttempt,
  saveAttempt,
  forgetAttempt,
  sameCart,
  newRequestId,
} from "../src/storefront/orderAttempt.js";

test("Recovery survives reloading its data without persisting the password", () => {
  const map = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
  const payload = {
    requestId: newRequestId(),
    motDePasse: "NotPersisted123",
    lignes: [{ produitId: "a", quantite: 1 }],
  };
  assert.match(
    payload.requestId,
    /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
  );
  saveAttempt(payload, "/commandes/checkout");
  assert.equal(readAttempt().payload.requestId, payload.requestId);
  assert.equal(readAttempt().payload.motDePasse, undefined);
  assert.ok(![...map.values()][0].includes("NotPersisted123"));
  forgetAttempt();
  assert.equal(readAttempt(), null);
});
test("A changed cart is not silently cleared when recovering a previous order", () => {
  assert.equal(
    sameCart([{ id: "a", quantity: 2 }], [{ produitId: "a", quantite: 1 }]),
    false,
  );
  assert.equal(
    sameCart([{ id: "a", quantity: 1 }], [{ produitId: "a", quantite: 1 }]),
    true,
  );
});
test("Unreadable recovery data blocks creating a fresh attempt", () => {
  globalThis.sessionStorage = { getItem: () => "{bad json" };
  assert.equal(readAttempt().invalid, true);
});
