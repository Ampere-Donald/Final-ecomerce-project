import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogueFamilies,
  categoryDestination,
  highlightParts,
  suggestionPath,
} from "../src/storefront/catalogueNavigation.js";

test("navigation keeps every real category once without fabricating children", () => {
  const rows = [
    { id: "wire", nom: "Câbles & Connectique" },
    { id: "power", nom: "Alimentation & Energie" },
    { id: "cells", nom: "Piles & Batteries" },
    { id: "unknown", nom: "Nouvelle famille réelle" },
  ];
  const families = catalogueFamilies({ data: rows });
  assert.equal(families[0].key, "cables");
  assert.deepEqual(
    families.find((f) => f.key === "power").categories.map((c) => c.id),
    ["power", "cells"],
  );
  assert.deepEqual(
    families
      .flatMap((f) => f.categories)
      .map((c) => c.id)
      .sort(),
    rows.map((c) => c.id).sort(),
  );
  assert.equal(
    families.some((f) => f.key === "video"),
    false,
  );
  assert.deepEqual(catalogueFamilies(null), []);
});

test("category destinations and suggestions encode untrusted query values", () => {
  assert.equal(
    categoryDestination("id&search=other"),
    "/catalogue?category=id%26search%3Dother",
  );
  const params = new URLSearchParams(
    suggestionPath("  câble HDMI & 5V  ").split("?")[1],
  );
  assert.equal(params.get("search"), "câble HDMI & 5V");
  assert.equal(params.get("salesSearch"), "true");
  assert.equal(params.get("limit"), "8");
});

test("highlight preserves original accented content and merges overlapping matches", () => {
  const text = "  Câble HDMI — câble";
  const parts = highlightParts(text, "cable cab");
  assert.equal(parts.map((p) => p.text).join(""), text);
  assert.deepEqual(
    parts.filter((p) => p.match).map((p) => p.text),
    ["Câble", "câble"],
  );
  assert.equal(
    highlightParts("<b>IRF510</b>", "IRF510")
      .map((p) => p.text)
      .join(""),
    "<b>IRF510</b>",
  );
  assert.deepEqual(highlightParts("IRF510", ""), [
    { text: "IRF510", match: false },
  ]);
});
