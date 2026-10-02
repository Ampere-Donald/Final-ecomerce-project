import test from "node:test";
import assert from "node:assert/strict";
import {
  initialChoices,
  materialRows,
  projectLink,
  projectSelection,
  readProject,
  readProjectPage,
  selectionChanged,
} from "../src/storefront/projectData.js";
import { cartReducer } from "../src/storefront/cartState.js";
const part = (id, stock = 10, price = 3000) => ({
  id,
  nomProduit: "Pièce " + id,
  code: "DEMO-" + id + "-N",
  estActif: true,
  prixDetail: price,
  quantiteStock: stock,
  attributs: [{ nomAttribut: "Critère", valeurs: [{ valeur: "N" }] }],
});
const line = (id, necessary = true) => ({
  id: "line-" + id,
  ordre: 0,
  role: "Rôle fictif",
  quantite: 2,
  necessaire: necessary,
  referenceAttendue: "DEMO-" + id + "-N",
  nomAttendu: "Pièce " + id,
  produit: part(id),
  validationActuelle: true,
  disponible: true,
  prixConnu: true,
  montant: 6000,
});
const project = (changes) => ({
  id: "fixture",
  slug: "fixture-project",
  version: 1,
  titre: "Projet fictif",
  resume: "Recette",
  objectif: "Vérifier",
  prerequis: "Fictif",
  contraintes: "Pas un montage réel",
  niveau: "DEBUTANT",
  validationActuelle: true,
  materielRequisDisponible: true,
  documents: [{ titre: "Recette", url: "https://example.com/recipe" }],
  lignes: [line("a"), line("b", false)],
  ...changes,
});
const rows = (p) => materialRows(p, (url) => url);

test("Public contract rejects identity mismatch, duplicate lines/products, oversized and malformed technical data", () => {
  assert.equal(readProject(project(), "fixture-project").id, "fixture");
  assert.throws(() => readProject(project(), "another-project"));
  assert.throws(() => readProject(project({ slug: 123 })));
  assert.throws(() => readProject(project({ lignes: [line("a"), line("a")] })));
  assert.throws(() =>
    readProject(
      project({ lignes: [line("a"), { ...line("a"), id: "different" }] }),
    ),
  );
  assert.throws(() =>
    readProject(
      project({
        lignes: [{ ...line("a"), produit: { ...part("a"), attributs: [{}] } }],
      }),
    ),
  );
  assert.throws(() =>
    readProjectPage({ data: [], meta: { lastPage: "1", total: 0 } }),
  );
  assert.throws(() =>
    readProject(
      project({
        lignes: [{ ...line("a"), produit: { ...part("a"), imageUrl: {} } }],
      }),
    ),
  );
  assert.throws(() =>
    readProjectPage({
      data: [project(), project()],
      meta: { lastPage: 1, total: 2 },
    }),
  );
  assert.equal(
    readProjectPage({ data: [project()], meta: { lastPage: 1, total: 1 } }).rows
      .length,
    1,
  );
});
test("Only recommended required lines are initially selected; quantities and suffixes are preserved", () => {
  const p = project(),
    r = rows(p),
    choice = initialChoices(p);
  assert.deepEqual(choice["line-a"], { selected: true, quantity: "2" });
  assert.equal(choice["line-b"].selected, false);
  const selected = projectSelection(r, choice, []);
  assert.equal(selected.error, null);
  assert.equal(selected.partial, false);
  assert.equal(selected.total, 6000);
  assert.equal(selected.items[0].product.reference, "DEMO-a-N");
});
test("Quantity and availability are validated against both selected additions and current cart without trimming", () => {
  const p = project(),
    r = rows(p),
    choice = initialChoices(p);
  choice["line-a"].quantity = "9";
  assert.equal(
    projectSelection(r, choice, [{ id: "a", quantity: 2 }]).error,
    "insufficient",
  );
  assert.equal(choice["line-a"].quantity, "9");
  for (const quantity of ["0", "-1", "1.5", "", "NaN", "10001"]) {
    choice["line-a"].quantity = quantity;
    assert.equal(projectSelection(r, choice, []).error, "quantity");
  }
});
test("Unknown price/stock, missing product and stale technical approval cannot be added", () => {
  for (const [changes, reason] of [
    [{ produit: null }, "missing"],
    [{ validationActuelle: false }, "approval"],
    [{ produit: part("a", 0) }, "out"],
    [{ produit: part("a", null) }, "availability"],
    [{ produit: part("a", 10, null), prixConnu: false }, "price"],
    [{ produit: part("a", 10, true) }, "price"],
  ]) {
    const p = project({ lignes: [{ ...line("a"), ...changes }] });
    assert.equal(
      projectSelection(rows(p), initialChoices(p), []).error,
      reason,
    );
  }
  const p = project({ validationActuelle: false });
  assert.equal(rows(p)[0].reason, "approval");
});
test("Optional shortage does not block a complete required selection; omitting required material marks partial", () => {
  const p = project({
    lignes: [
      line("a"),
      { ...line("b", false), produit: part("b", 0), disponible: false },
    ],
  });
  const choices = initialChoices(p),
    r = rows(p);
  assert.equal(projectSelection(r, choices, []).error, null);
  assert.equal(projectSelection(r, choices, []).partial, false);
  choices["line-a"].quantity = "1";
  assert.equal(projectSelection(r, choices, []).partial, true);
  choices["line-b"].selected = true;
  assert.equal(projectSelection(r, choices, []).error, "out");
});
test("Changed price, stock, reference or published version requires a fresh customer acceptance", () => {
  const before = project(),
    chosen = initialChoices(before);
  for (const changes of [
    { version: 2 },
    { lignes: [{ ...line("a"), produit: part("a", 9) }, line("b", false)] },
    {
      lignes: [
        { ...line("a"), produit: part("a", 10, 3500) },
        line("b", false),
      ],
    },
  ]) {
    const after = project(changes);
    assert.equal(
      selectionChanged(before, after, rows(before), rows(after), chosen),
      true,
    );
  }
  assert.equal(
    selectionChanged(before, project(), rows(before), rows(project()), chosen),
    false,
  );
});
test("A selected line removed from the project remains visible and blocks adding until explicitly unchecked", () => {
  const before = project(),
    choices = initialChoices(before);
  const after = project({ version: 2, lignes: [line("b")] });
  const updated = materialRows(after, (url) => url, rows(before), choices);
  assert.equal(updated.find((r) => r.id === "line-a").reason, "removed");
  assert.equal(projectSelection(updated, choices, []).error, "removed");
  assert.equal(choices["line-a"].selected, true);
  assert.equal(choices["line-b"].selected, false); // New required lines never auto-select.
});
test("A group fails atomically if any chosen quantity exceeds the live stock", () => {
  const p = project(),
    choice = initialChoices(p);
  choice["line-b"] = { selected: true, quantity: "20" };
  const selection = projectSelection(rows(p), choice, []);
  const old = [{ ...rows(p)[0].product, quantity: 1 }];
  assert.equal(
    cartReducer(old, { type: "ADD_SELECTION", payload: selection.items }),
    old,
  );
});
test("Documents reject script URLs and embedded credentials, own image paths remain usable", () => {
  assert.equal(projectLink("javascript:alert(1)"), null);
  assert.equal(projectLink("https://user:password@example.com"), null);
  assert.equal(
    projectLink("/design-e/hdmi-5m.webp", true),
    "/design-e/hdmi-5m.webp",
  );
  assert.equal(projectLink("/design-e/../../secret", true), null);
});
