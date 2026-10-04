import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createJourneyCollector,
  observation,
  validObservation,
  createFeeObservation,
} from "../src/storefront/journeyData.js";
import { cartJourneyReducer } from "../src/storefront/cartState.js";

const now = new Date("2026-10-04T12:00:00Z");
const event = (name = "FICHE_OUVERTE", extra = {}) =>
  observation(name, {
    now,
    lang: "fr",
    width: 390,
    uuid: randomUUID,
    ...extra,
  });
function collector(options = {}) {
  const sent = [],
    timers = new Map();
  let next = 0;
  const value = createJourneyCollector({
    now: () => now,
    capability: async () => true,
    send: async (payload, keepalive) => {
      sent.push({ payload, keepalive });
      return "accepted";
    },
    schedule: (fn, delay) => {
      timers.set(++next, { fn, delay });
      return next;
    },
    cancel: (id) => timers.delete(id),
    ...options,
  });
  return { value, sent, timers };
}

test("Closed observations use Douala days and screen classes without adding personal data", () => {
  assert.equal(
    event("FICHE_OUVERTE", { now: new Date("2026-10-03T23:30:00Z") }).jour,
    "2026-10-04",
  );
  assert.equal(
    event("FICHE_OUVERTE", { width: 900, lang: "en" }).appareil,
    "tablette",
  );
  assert.equal(event("FICHE_OUVERTE", { width: 1440 }).appareil, "ordinateur");
  assert.equal(event("COMMANDE_ENREGISTREE"), null);
  assert.equal(event("FRAIS_VUS"), null);
  assert.equal(event("FICHE_OUVERTE", { uuid: () => "not-secure" }), null);
  assert.equal(
    validObservation({ ...event(), query: "private@example.invalid" }),
    false,
  );
  assert.equal(validObservation({ ...event(), jour: "2026-02-30" }), false);
});

test("Disabled or unavailable capability drops queued events, never posts and starts once", async () => {
  for (const active of [false, "failure"]) {
    let calls = 0;
    const { value, sent, timers } = collector({
      capability: async () => {
        calls++;
        if (active === "failure") throw Error();
        return active;
      },
    });
    value.push(event());
    await Promise.all([value.start(), value.start()]);
    value.push(event());
    await value.flush();
    assert.equal(calls, 1);
    assert.equal(sent.length, 0);
    assert.equal(timers.size, 0);
  }
});

test("A lost reply retries exactly the same observation and StrictMode replay is ignored", async () => {
  const sent = [];
  const { value } = collector({
    send: async (p) => {
      sent.push(structuredClone(p));
      if (sent.length === 1) throw Error("lost committed reply");
      return "accepted";
    },
  });
  const one = event();
  value.push(one);
  value.push(one);
  await value.start();
  await value.flush();
  await value.flush();
  value.push(one);
  await value.flush();
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(sent[0].evenements.length, 1);
  assert.deepEqual(Object.keys(sent[0].evenements[0]).sort(), [
    "appareil",
    "evenement",
    "id",
    "jour",
    "langue",
    "reception",
  ]);
});

test("Retries, batches and memory are bounded and a server disable stops remaining events", async () => {
  let attempts = 0;
  const { value, timers } = collector({
    send: async () => {
      attempts++;
      throw Error();
    },
  });
  value.push(event());
  await value.start();
  for (let n = 0; n < 8; n++) await value.flush();
  assert.equal(attempts, 3);
  assert.equal(timers.size, 0);
  const normal = collector();
  for (let n = 0; n < 100; n++) normal.value.push(event());
  await normal.value.start();
  assert.equal([...normal.timers.values()][0].delay, 5000);
  for (let n = 0; n < 4; n++) await normal.value.flush(true);
  assert.equal(normal.sent.length, 3);
  assert.ok(
    normal.sent.every((b) => b.payload.evenements.length === 20 && b.keepalive),
  );
  const off = collector({ send: async () => "disabled" });
  for (let n = 0; n < 30; n++) off.value.push(event());
  await off.value.start();
  await off.value.flush();
  await off.value.flush();
  assert.equal(off.timers.size, 0);
});

test("No overlapping HTTP batch and stale days do not get sent", async () => {
  let release,
    calls = 0;
  const { value } = collector({
    send: () => {
      calls++;
      return new Promise((r) => {
        release = r;
      });
    },
  });
  value.push(event());
  await value.start();
  const flight = value.flush();
  await value.flush();
  assert.equal(calls, 1);
  release("accepted");
  await flight;
  const stale = collector();
  stale.value.push(event("FICHE_OUVERTE", { now: new Date("2026-10-01") }));
  await stale.value.start();
  await stale.value.flush();
  assert.equal(stale.sent.length, 0);
});

test("Hydration, quantity edits, stock-capped no-ops and rejected groups are not additions", () => {
  const p = { id: "p", code: "p", retailPrice: 100, stock: 2 };
  let state = { items: [], observations: [] };
  state = cartJourneyReducer(state, {
    type: "HYDRATE",
    payload: [{ ...p, quantity: 1 }],
  });
  assert.equal(state.observations.length, 0);
  const e = event("AJOUT_PANIER");
  const action = {
    type: "ADD_ITEM",
    payload: { product: p, quantity: 1 },
    observations: [e],
  };
  const a = cartJourneyReducer(state, action),
    b = cartJourneyReducer(state, action);
  assert.deepEqual(a, b);
  assert.equal(a.observations.length, 1);
  state = cartJourneyReducer(a, { type: "OBSERVATIONS_SENT", ids: [e.id] });
  assert.equal(
    cartJourneyReducer(state, {
      ...action,
      observations: [event("AJOUT_PANIER")],
    }).observations.length,
    0,
  );
  state = cartJourneyReducer(state, {
    type: "UPDATE_QUANTITY",
    payload: { code: "p", quantity: 1 },
  });
  assert.equal(state.observations.length, 0);
  const group = {
    type: "ADD_SELECTION",
    payload: [{ product: p, quantity: 2 }],
    observations: [event("AJOUT_PANIER"), event("REACHAT_AJOUTE")],
  };
  assert.equal(cartJourneyReducer(state, group).observations.length, 0);
  assert.equal(
    cartJourneyReducer(state, {
      ...group,
      payload: [{ product: p, quantity: 1 }],
    }).observations.length,
    2,
  );
});

test("Only exposed fees followed by departure count; renders and known/uncertain orders do not", () => {
  for (const mode of ["unseen", "seen", "pending", "known", "rejected"]) {
    const events = [],
      f = createFeeObservation((...e) => events.push(e));
    if (mode !== "unseen") {
      f.expose("LIVRAISON_A_CONFIRMER", "fr");
      f.expose("LIVRAISON_A_CONFIRMER", "en");
    }
    if (["pending", "known", "rejected"].includes(mode)) f.orderStarted();
    if (mode === "known") f.orderKnown();
    if (mode === "rejected") f.orderRejected();
    f.leave();
    f.leave();
    assert.equal(
      events.filter((e) => e[0] === "FRAIS_VUS").length,
      mode === "unseen" ? 0 : 1,
    );
    assert.equal(
      events.filter((e) => e[0] === "SORTIE_APRES_FRAIS").length,
      ["seen", "rejected"].includes(mode) ? 1 : 0,
    );
  }
});

test("A persisted-browser return exposes fees anew but preserves uncertain submission state", () => {
  const events = [],
    f = createFeeObservation((...e) => events.push(e));
  f.expose("RETRAIT", "en");
  f.leave();
  f.resume();
  f.expose("RETRAIT", "en");
  f.orderStarted();
  f.leave();
  f.resume();
  f.expose("RETRAIT", "en");
  f.leave();
  assert.equal(events.filter((e) => e[0] === "FRAIS_VUS").length, 3);
  assert.equal(events.filter((e) => e[0] === "SORTIE_APRES_FRAIS").length, 1);
});
