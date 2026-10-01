import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readReception,
  persistReception,
  RECEPTION_KEY,
} from "../src/storefront/receptionData.js";
import {
  adviceMessage,
  adviceHref,
} from "../src/storefront/productAdviceData.js";
const storage = () => {
  let value;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
};
test("preserves only reception mode and normalized town across reload", () => {
  const s = storage();
  persistReception(
    {
      mode: "LIVRAISON",
      ville: "  Yaounde\u0301  ",
      telephone: "secret",
      adresse: "private",
    },
    s,
  );
  assert.deepEqual(readReception(s), { mode: "LIVRAISON", ville: "Yaoundé" });
  assert.doesNotMatch(s.getItem(RECEPTION_KEY), /secret|private/);
  persistReception({ mode: "RETRAIT_MAGASIN", ville: "Yaoundé" }, s);
  assert.deepEqual(readReception(s), { mode: "RETRAIT_MAGASIN", ville: "" });
});
test("corrupt, obsolete or unsafe preference falls back to pickup", () => {
  for (const raw of [
    "{",
    '{"schema":2,"mode":"LIVRAISON","ville":"Douala"}',
    JSON.stringify({ schema: 1, mode: "LIVRAISON", ville: "a".repeat(81) }),
    JSON.stringify({ schema: 1, mode: "LIVRAISON", ville: "Douala\nsecret" }),
  ])
    assert.equal(readReception({ getItem: () => raw }).mode, "RETRAIT_MAGASIN");
});
test("storage refusal is explicit instead of claiming persistence", () => {
  const result = persistReception(
    { mode: "LIVRAISON", ville: "Douala" },
    {
      setItem: () => {
        throw new Error("blocked");
      },
    },
  );
  assert.equal(result.saved, false);
  assert.equal(result.reception.ville, "Douala");
});
test("parts advice preserves suffix and chosen quantity, excludes URL tracking and private values", () => {
  const product = {
    id: "LM358/N",
    model: "Amplificateur",
    reference: "LM358-N",
    telephone: "private",
    englishName: "Amplifier",
  };
  const message = adviceMessage(
    product,
    3,
    "fr",
    "http://127.0.0.1:5187?private=secret",
  );
  assert.match(message, /LM358-N/);
  assert.match(message, /Quantité souhaitée : 3/);
  assert.match(message, /product\/LM358%2FN/);
  assert.doesNotMatch(message, /private|secret/);
  assert.match(
    adviceMessage(product, 2, "en", "https://newoteg.com"),
    /Product: Amplifier/,
  );
});
test("WhatsApp draft survives special characters and rejects empty/overlong text", () => {
  const text = "Bonjour, tension 3.3V & connecteur + référence LM358-N ?";
  assert.equal(new URL(adviceHref(text)).searchParams.get("text"), text);
  assert.equal(adviceHref(" "), null);
  assert.equal(adviceHref("a".repeat(1801)), null);
});
