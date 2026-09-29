import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptanceKey,
  offerIsValid,
  canAcceptOffer,
  readAcceptance,
  saveAcceptance,
  clearAcceptance,
  acceptedResponseValid,
} from "../src/storefront/devisAcceptance.js";

const now = Date.parse("2026-09-29T10:00:00Z");
const request = {
  id: "request-a",
  version: 4,
  statut: "ENVOYEE",
  modeReception: "LIVRAISON",
  destination: "Douala",
  offre: {
    numero: "PRO-001",
    dateExpiration: "2026-10-29T12:00:00Z",
    montantArticles: 7500,
    lignes: [
      {
        produitId: "product-a",
        nomProduit: "LM358-N",
        quantite: 5,
        prixUnitaire: 1500,
        sousTotal: 7500,
      },
    ],
  },
};
const attempt = {
  ownerId: "client-a",
  demandeId: request.id,
  phase: "pending",
  payload: {
    requestId: "00000000-0000-4000-8000-000000000001",
    version: 4,
    conditionsAcceptees: true,
  },
};
const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};

test("offer requires a valid full receipt, reception, unique lines and the current unexpired sent state", () => {
  assert.equal(offerIsValid(request), true);
  assert.equal(canAcceptOffer(request, now), true);
  for (const statut of [
    "RECUE",
    "A_PRECISER",
    "REFUSEE",
    "EXPIREE",
    "ACCEPTEE",
  ]) {
    assert.equal(canAcceptOffer({ ...request, statut }, now), false);
  }
  assert.equal(
    canAcceptOffer(request, Date.parse(request.offre.dateExpiration)),
    false,
  );
  const badOffers = [
    { ...request.offre, montantArticles: 7400 },
    { ...request.offre, lignes: [] },
    { ...request.offre, dateExpiration: "invalid" },
    {
      ...request.offre,
      lignes: [...request.offre.lignes, ...request.offre.lignes],
      montantArticles: 15000,
    },
    {
      ...request.offre,
      lignes: [{ ...request.offre.lignes[0], sousTotal: 7499 }],
    },
    {
      ...request.offre,
      lignes: [{ ...request.offre.lignes[0], quantite: -5 }],
    },
    {
      ...request.offre,
      lignes: [{ ...request.offre.lignes[0], prixUnitaire: NaN }],
    },
  ];
  for (const offre of badOffers)
    assert.equal(offerIsValid({ ...request, offre }), false);
  assert.equal(offerIsValid({ ...request, destination: "" }), false);
  assert.equal(offerIsValid({ ...request, modeReception: "UNKNOWN" }), false);
});

test("reload preserves exact UUID/version and separates account and request scopes", () => {
  const store = storage();
  assert.equal(saveAcceptance(attempt, store), true);
  assert.deepEqual(readAcceptance("client-a", request.id, store), {
    attempt,
    blocked: false,
  });
  assert.deepEqual(readAcceptance("client-b", request.id, store), {
    attempt: null,
    blocked: false,
  });
  assert.deepEqual(readAcceptance("client-a", "request-b", store), {
    attempt: null,
    blocked: false,
  });
  assert.notEqual(acceptanceKey("a:b", "c"), acceptanceKey("a", "b:c"));
  const review = { ...attempt, phase: "review" };
  saveAcceptance(review, store);
  assert.deepEqual(
    readAcceptance("client-a", request.id, store).attempt,
    review,
  );
  assert.equal(clearAcceptance("client-a", request.id, store), true);
  assert.equal(readAcceptance("client-a", request.id, store).attempt, null);
});

test("corrupt or incomplete attempts fail closed and never infer consent or manufacture an identity", () => {
  const store = storage(),
    key = acceptanceKey("client-a", request.id);
  for (const value of [
    "{broken",
    "null",
    JSON.stringify({ ...attempt, demandeId: "other" }),
    JSON.stringify({
      ...attempt,
      payload: {
        ...attempt.payload,
        requestId: "11111111-1111-1111-1111-111111111111",
      },
    }),
    JSON.stringify({
      ...attempt,
      payload: { ...attempt.payload, conditionsAcceptees: false },
    }),
    JSON.stringify({ ...attempt, payload: { ...attempt.payload, version: 0 } }),
    JSON.stringify({
      ...attempt,
      payload: { ...attempt.payload, clientId: "fake" },
    }),
  ]) {
    store.setItem(key, value);
    assert.equal(readAcceptance("client-a", request.id, store).blocked, true);
  }
  store.setItem(key, JSON.stringify({ ...attempt, ownerId: "client-b" }));
  assert.deepEqual(readAcceptance("client-a", request.id, store), {
    attempt: null,
    blocked: false,
  });
});

test("storage denial or discarded write prevents sending and clearing recovery", () => {
  const denied = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
    removeItem() {
      throw new Error("denied");
    },
  };
  assert.equal(readAcceptance("client-a", request.id, denied).blocked, true);
  assert.equal(saveAcceptance(attempt, denied), false);
  assert.equal(clearAcceptance("client-a", request.id, denied), false);
  assert.equal(saveAcceptance(attempt, { ...storage(), setItem() {} }), false);
});

test("acceptance response must identify this request and a usable private order; a 200 alone is insufficient", () => {
  const result = {
    demandeId: request.id,
    replayed: true,
    commande: {
      id: "order-a",
      numeroSuivi: "NWG-001",
      statut: "EN_ATTENTE",
      montantTotal: 7500,
      modeReception: "LIVRAISON",
    },
  };
  assert.equal(acceptedResponseValid(result, request.id), true);
  assert.equal(acceptedResponseValid(result, "other-request"), false);
  assert.equal(
    acceptedResponseValid({ ...result, replayed: undefined }, request.id),
    false,
  );
  for (const change of [
    { id: "" },
    { numeroSuivi: null },
    { montantTotal: "7500" },
    { statut: "PAYEE" },
    { modeReception: "UNKNOWN" },
  ]) {
    assert.equal(
      acceptedResponseValid(
        { ...result, commande: { ...result.commande, ...change } },
        request.id,
      ),
      false,
    );
  }
});
