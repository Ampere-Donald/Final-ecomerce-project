const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://127.0.0.1:5186";
const out = path.resolve(__dirname, "../../docs/refonte-e/captures");
const id = "11111111-1111-4111-8111-111111111111",
  candidate = "22222222-2222-4222-8222-222222222222";
const suggestion = {
  produitId: candidate,
  nomProduit: "Composant de démonstration B",
  code: "QA-B",
  quantiteStock: 8,
  prixDetail: 2500,
  raison:
    "Exemple de raison technique renvoyée par le service pour ce montage.",
  compatibilite: "haute",
  avertissement:
    "Brochage et dimensions à vérifier sur la pièce d’origine. Données de test.",
};
let mode = "success";
let count = 0;
const payloads = [],
  checks = [],
  errors = [];
const ok = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const context = await browser.newContext({
      locale: "fr-FR",
      viewport: { width: 1440, height: 1000 },
    });
    await context.route("https://accounts.google.com/**", (r) => r.abort());
    await context.route("**/api/**", async (r) => {
      const u = new URL(r.request().url());
      const send = (data, status = 200) =>
        r.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (u.pathname === "/api/equivalence/suggest") {
        assert.equal(r.request().method(), "POST");
        payloads.push(r.request().postDataJSON());
        count++;
        const m = mode;
        if (m === "delay")
          await new Promise((resolve) => setTimeout(resolve, 600));
        if (m === "error") return send({ message: "QA failure" }, 503);
        if (m === "malformed") return send({ no: "suggestions" });
        if (m === "empty")
          return send({
            suggestions: [],
            message:
              "Aucun composant en stock ne permet de proposer un équivalent.",
          });
        if (m === "ineligible")
          return send({
            suggestions: [],
            message:
              "Les équivalences sont disponibles uniquement pour les composants électroniques du catalogue X-electronic.",
          });
        return send({
          suggestions: [suggestion],
          message:
            m === "fallback"
              ? "Suggestions catalogue générées sans IA distante."
              : undefined,
        });
      }
      assert.equal(r.request().method(), "GET", "No other mutation allowed");
      if (u.pathname === "/api/produits/" + id)
        return send({
          id,
          nomProduit: "Composant de démonstration A",
          quantiteStock: 0,
          prixDetail: 2000,
          categorie: { nom: "Composants Électroniques" },
        });
      if (u.pathname === "/api/produits/" + candidate)
        return send({
          id: candidate,
          nomProduit: suggestion.nomProduit,
          quantiteStock: 8,
          prixDetail: 2500,
        });
      return send({ data: [], meta: { total: 0, lastPage: 1 } });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/");
    await page
      .getByRole("link", { name: "Trouver un équivalent", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Trouver un équivalent", exact: true })
      .waitFor();
    assert.equal(count, 0);
    ok("Home entry; no automatic inference request");
    const input = page.getByLabel("La pièce que vous cherchez");
    const search = page.getByRole("button", {
      name: "Rechercher un équivalent",
      exact: true,
    });
    await input.fill("   ");
    assert(await search.isDisabled());
    await input.fill("Référence introuvable QA");
    await search.click();
    await page.locator(".e-equivalent").waitFor();
    assert.deepEqual(payloads.at(-1), {
      query: "Référence introuvable QA",
      source: "ecommerce",
    });
    assert(
      (await page.locator(".e-equivalent-warning").textContent()).includes(
        suggestion.avertissement,
      ),
    );
    assert.equal(
      await page
        .getByText("Compatibilité élevée suggérée", { exact: true })
        .count(),
      1,
    );
    assert.equal(
      await page.getByRole("button", { name: /Ajouter/ }).count(),
      0,
    );
    ok(
      "Free text uses service and displays reason, warning and qualitative compatibility",
    );
    for (const width of [360, 390, 768, 1100, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Overflow at ${width}`,
      );
      if ([390, 1440].includes(width)) {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: path.join(out, `equivalences-${width}.png`),
          fullPage: true,
        });
      }
    }
    ok("Equivalence results responsive at five widths");
    await input.fill("Autre référence");
    assert.equal(await page.locator(".e-equivalent").count(), 0);
    mode = "delay";
    await search.click();
    await input.fill("Nouvelle référence");
    await page.waitForTimeout(900);
    assert.equal(await page.locator(".e-equivalent").count(), 0);
    ok("Editing cancels and invalidates earlier results");
    mode = "error";
    await search.click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByText("Aucun équivalent proposé").count(), 0);
    mode = "success";
    await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await page.locator(".e-equivalent").waitFor();
    ok("Failure distinct from empty; retry");
    mode = "empty";
    await search.click();
    await page
      .getByRole("heading", { name: "Aucun équivalent proposé" })
      .waitFor();
    assert.equal(await page.locator(".e-equivalent").count(), 0);
    ok("No fabricated alternatives for empty response");
    mode = "fallback";
    await search.click();
    await page.getByText("Correspondance catalogue", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByText("Compatibilité élevée suggérée", { exact: true })
        .count(),
      0,
    );
    ok("Catalogue fallback is not presented as technical compatibility");
    mode = "ineligible";
    await search.click();
    await page
      .getByText("Les équivalences sont disponibles uniquement", {
        exact: false,
      })
      .waitFor();
    ok("Server eligibility explanation retained");
    mode = "malformed";
    await search.click();
    await page.getByRole("alert").waitFor();
    ok("Malformed response shows error");
    mode = "success";
    await page.goto(base + "/catalogue?search=QA-absente");
    await page
      .getByRole("heading", { name: "Aucun résultat pour cette recherche" })
      .waitFor();
    await page
      .getByRole("link", { name: "Trouver un équivalent", exact: true })
      .click();
    assert.equal(await input.inputValue(), "QA-absente");
    ok("No-result catalogue carries reference into search");
    await page.goto(base + "/product/" + id);
    await page
      .getByRole("heading", { name: "Composant de démonstration A" })
      .waitFor();
    await page
      .getByRole("link", { name: "Trouver un équivalent", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Trouver un équivalent", exact: true })
      .waitFor();
    await search.click();
    await page.locator(".e-equivalent").waitFor();
    assert.deepEqual(payloads.at(-1), { produitId: id, source: "ecommerce" });
    ok("Product lookup uses stable product ID");
    await input.fill("Pièce différente");
    await search.click();
    await page.locator(".e-equivalent").waitFor();
    assert.deepEqual(payloads.at(-1), {
      query: "Pièce différente",
      source: "ecommerce",
    });
    ok("Edited product search switches to free text");
    await page.getByRole("link", { name: "Examiner cette pièce" }).click();
    await page.getByRole("heading", { name: suggestion.nomProduit }).waitFor();
    ok("Suggested item opens its existing product page");
    await page.setViewportSize({ width: 390, height: 950 });
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Équivalences", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Trouver un équivalent", exact: true })
      .waitFor();
    ok("Mobile menu exposes the feature");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "equivalences-verification.json"),
      JSON.stringify({ checks, errors, payloads, fixtureOnly: true }, null, 2),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
