import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewContent,
  reviewList,
  saveReviewAttempt,
  readReviewAttempt,
  clearReviewAttempts,
  reviewReceipt,
  guestReviewOrder,
} from "../src/storefront/reviewData.js";
const id = "0634b3a5-6e4e-48aa-8047-f94bc988c1f3",
  requestId = "21287bd0-cb21-440e-8dc5-47ce89f9cc89";
const content = {
  note: 1,
  texte: "Ce composant chauffe beaucoup.",
  pseudonyme: "Maker",
  projetRealise: "Test",
};
function storage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i],
  };
}
test("negative review, explicit content bounds and no silent rating conversion", () => {
  assert.equal(reviewContent(content).note, 1);
  for (const value of [
    { note: 0 },
    { note: "5" },
    { texte: "   " },
    { pseudonyme: " " },
    { texte: "abc\0xxxxxxxxxx" },
  ])
    assert.throws(() => reviewContent({ ...content, ...value }));
});
test("durable attempt retains exact request and content; denied or dropped writes block submission", () => {
  const store = storage(),
    value = {
      scope: "account:user:" + id,
      mode: "account",
      orderId: id,
      body: { requestId, ligneCommandeId: id, ...content },
    };
  saveReviewAttempt(value, store);
  assert.deepEqual(readReviewAttempt(value.scope, store), value);
  assert.throws(() =>
    saveReviewAttempt(value, {
      setItem() {},
      getItem() {
        return null;
      },
    }),
  );
  assert.throws(() =>
    saveReviewAttempt(value, {
      setItem() {
        throw Error("denied");
      },
    }),
  );
  store.setItem("newoteg_review_v1:" + value.scope, "broken");
  assert.throws(() => readReviewAttempt(value.scope, store));
});
test("private consent and logout cleanup keep unrelated storage", () => {
  const store = storage(),
    scope = "guest:private:" + id;
  const value = {
    scope,
    mode: "guest",
    orderId: id,
    body: { requestId, ligneCommandeId: id, ...content },
    accessToken: "a".repeat(43),
    actionKey: "b".repeat(43),
    challengeId: id,
  };
  saveReviewAttempt(value, store);
  store.setItem("cart", "keep");
  assert.equal(guestReviewOrder(value.accessToken, store), id);
  assert.equal(guestReviewOrder("z".repeat(43), store), null);
  assert.throws(() =>
    saveReviewAttempt({ ...value, challengeId: "invalid" }, store),
  );
  clearReviewAttempts("guest", store);
  assert.equal(readReviewAttempt(scope, store), null);
  assert.equal(guestReviewOrder(value.accessToken, store), null);
  assert.equal(store.getItem("cart"), "keep");
});
test("empty rating stays null; malformed or unverified public data is refused", () => {
  assert.equal(
    reviewList({ total: 0, moyenne: null, page: 1, limit: 10, items: [] }, 1)
      .moyenne,
    null,
  );
  const value = {
    total: 1,
    moyenne: 1,
    page: 1,
    limit: 10,
    items: [
      {
        ...content,
        id,
        achatVerifie: true,
        createdAt: new Date().toISOString(),
        reponseBoutique: null,
      },
    ],
  };
  assert.equal(reviewList(value, 1).total, 1);
  for (const item of [
    { ...value.items[0], achatVerifie: false },
    { ...value.items[0], note: 0 },
  ])
    assert.throws(() => reviewList({ ...value, items: [item] }, 1));
  assert.throws(() => reviewList({ ...value, page: 2 }, 1));
  assert.throws(() =>
    reviewList({ ...value, total: 0, moyenne: 0, items: [] }, 1),
  );
  assert.equal(reviewReceipt({ id, enregistre: true }), true);
  assert.equal(reviewReceipt({ id, enregistre: "true" }), false);
});
