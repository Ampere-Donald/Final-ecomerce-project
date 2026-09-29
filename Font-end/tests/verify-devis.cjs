// All APIs are intercepted. These requests never reach Railway or reserve stock.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://127.0.0.1:5186";
const user = {
  id: "client-demo",
  nom: "Client Démonstration",
  telephone: "+237600000000",
  email: "fixture@example.invalid",
};
const product = {
  id: "00000000-0000-4000-8000-000000000001",
  nomProduit: "LM358-N",
  code: "LM358-N",
  quantiteStock: 30,
};
const checks = [],
  errors = [],
  attempts = [],
  clarifications = [],
  otherMutations = [];
let saved = null,
  loseFirstResponse = true;
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
      viewport: { width: 390, height: 900 },
      locale: "fr-FR",
    });
    await context.route("https://accounts.google.com/**", (r) => r.abort());
    await context.route("**/api/**", async (r) => {
      const u = new URL(r.request().url()),
        method = r.request().method();
      const send = (data, status = 200) =>
        r.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (u.pathname.endsWith("/auth/login"))
        return send({ access_token: "fixture-only", user });
      if (u.pathname.endsWith("/auth/me")) return send(user);
      if (u.pathname.endsWith("/devis/resolve")) {
        const input = r.request().postDataJSON();
        return send({
          lignes: input.lignes.map((l) => ({
            ...l,
            match: l.reference === "LM358-N" ? "exact" : "unknown",
            candidates: l.reference === "LM358-N" ? [product] : [],
          })),
        });
      }
      if (u.pathname.endsWith("/devis") && method === "POST") {
        const payload = r.request().postDataJSON();
        attempts.push(payload);
        assert.equal(
          r.request().headers().authorization,
          "Bearer fixture-only",
        );
        if (!saved)
          saved = {
            id: "request-demo",
            nomClient: user.nom,
            ...payload,
            createdAt: "2026-09-29T09:00:00Z",
            updatedAt: "2026-09-29T09:00:00Z",
            version: 1,
            statut: "RECUE",
            offre: null,
            reponseClient: null,
            lignes: payload.lignes.map((l) => ({
              ...l,
              nomProduit: l.produitId ? product.nomProduit : null,
            })),
          };
        if (loseFirstResponse) {
          loseFirstResponse = false;
          return r.abort("failed");
        }
        return send(saved);
      }
      if (u.pathname.endsWith("/devis/mine/request-demo/precision")) {
        const payload = r.request().postDataJSON();
        clarifications.push(payload);
        assert.equal(payload.version, 2);
        saved = {
          ...saved,
          ...payload,
          id: "request-demo",
          version: 3,
          statut: "RECUE",
        };
        return send(saved);
      }
      if (u.pathname.endsWith("/devis/mine")) return send(saved ? [saved] : []);
      if (u.pathname.endsWith("/devis/mine/request-demo")) return send(saved);
      if (u.pathname.includes("/devis/mine/"))
        return send({ message: "Demande de devis introuvable." }, 404);
      if (!["GET", "OPTIONS"].includes(method)) otherMutations.push(u.pathname);
      if (u.pathname.endsWith("/categories")) return send([]);
      if (u.pathname.endsWith("/commandes/my-orders")) return send([]);
      return send({ message: "Mock route not found" }, 404);
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/devis");
    await page
      .getByLabel("Vos références et quantités")
      .fill("LM358-N; 10\nINCONNU-X; 2");
    await page
      .getByRole("button", { name: "Vérifier les références", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Choisissez les articles de votre liste" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("combobox", { name: "Article pour LM358-N" })
        .inputValue(),
      "",
    );
    await page
      .getByRole("combobox", { name: "Article pour LM358-N" })
      .selectOption(product.id);
    assert.equal(attempts.length, 0);
    ok(
      "Public list preserves suffixes and unknown refs; exact matches are never auto-selected or submitted",
    );
    await page.getByRole("link", { name: "Se connecter pour envoyer" }).click();
    await page.getByLabel("E-mail ou téléphone").fill(user.email);
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill("fixture-password");
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await page.waitForURL(base + "/devis");
    assert.equal(
      await page.getByLabel("Vos références et quantités").inputValue(),
      "LM358-N; 10\nINCONNU-X; 2",
    );
    await page
      .getByRole("button", { name: "Vérifier les références", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Article pour LM358-N" })
      .waitFor();
    await page
      .getByRole("combobox", { name: "Article pour LM358-N" })
      .selectOption(product.id);
    await page.getByLabel("Livraison · frais et délai à confirmer").check();
    await page
      .getByLabel("Ville et destination de livraison")
      .fill("Douala, Bonamoussadi");
    await page.getByLabel("Téléphone de contact").fill(user.telephone);
    ok("Draft survives sign-in; delivery promises remain unconfirmed");
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow ${width}`,
      );
      if (width === 390 || width === 1440) {
        const out = path.resolve(__dirname, "../../docs/refonte-e/captures");
        fs.mkdirSync(out, { recursive: true });
        await page.screenshot({
          path: path.join(out, `devis-${width}.png`),
          fullPage: false,
        });
      }
    }
    ok("Quote list fits mobile, tablet and desktop");
    await page
      .getByRole("button", { name: "Envoyer ma demande de devis" })
      .dblclick();
    await page
      .getByRole("button", { name: "Reprendre le même envoi" })
      .waitFor();
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].lignes[0].produitId, product.id);
    assert.equal(attempts[0].lignes[1].produitId, undefined);
    assert.equal(attempts[0].prix, undefined);
    assert.equal(attempts[0].clientId, undefined);
    await page.reload();
    await page.getByRole("button", { name: "Reprendre le même envoi" }).click();
    await page.waitForURL(base + "/mes-devis/request-demo");
    await page
      .getByRole("heading", { name: "Votre liste transmise" })
      .waitFor();
    assert.deepEqual(attempts[0], attempts[1]);
    ok(
      "Lost response and reload resume one identical request without submitted prices or duplicate creation",
    );
    saved = {
      ...saved,
      version: 2,
      statut: "A_PRECISER",
      reponseClient: "Quelle référence pour la seconde ligne ?",
    };
    await page.getByRole("button", { name: "Actualiser", exact: true }).click();
    await page.getByRole("button", { name: "Préciser ma demande" }).click();
    await page.getByLabel("Vos références et quantités").fill("LM358-N; 12");
    await page
      .getByRole("button", { name: "Vérifier les références", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Article pour LM358-N" })
      .waitFor();
    await page
      .getByRole("combobox", { name: "Article pour LM358-N" })
      .selectOption(product.id);
    await page.getByRole("button", { name: "Envoyer mes précisions" }).click();
    await page.getByText("Demande reçue", { exact: true }).waitFor();
    assert.equal(clarifications.length, 1);
    assert.equal(clarifications[0].lignes[0].quantite, 12);
    assert.equal(
      await page.getByRole("button", { name: "Préciser ma demande" }).count(),
      0,
    );
    ok(
      "Private clarification updates the same request and refreshes its new state",
    );
    await page.goto(base + "/mes-devis/someone-else");
    await page
      .getByText("Demande de devis introuvable.", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByText(user.telephone, { exact: true }).count(),
      0,
    );
    ok("Inaccessible private request shows no customer details");
    await page.evaluate(() => {
      localStorage.setItem("newoteg_token", "different-session");
      localStorage.setItem(
        "newoteg_user",
        JSON.stringify({ id: "another-client", nom: "Other" }),
      );
      sessionStorage.setItem(
        "newoteg-devis-attempt-v1:another-client",
        JSON.stringify({
          ownerId: "client-demo",
          payload: { lignes: [{ reference: "PRIVATE-DRAFT", quantite: 1 }] },
        }),
      );
      sessionStorage.setItem(
        "newoteg-devis-draft-v1",
        JSON.stringify({ ownerId: "client-demo", text: "PRIVATE-DRAFT" }),
      );
    });
    // No restoration request should substitute the first account for this fixture.
    await context.route("**/api/auth/me", (r) =>
      r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ id: "another-client", nom: "Other" }),
      }),
    );
    await page.goto(base + "/devis");
    await page.getByLabel("Vos références et quantités").waitFor();
    assert.equal(
      await page.getByLabel("Vos références et quantités").inputValue(),
      "",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Reprendre le même envoi" })
        .count(),
      0,
    );
    ok(
      "Draft and pending attempt belonging to another account are not exposed",
    );
    await page.evaluate(() => sessionStorage.setItem('newoteg-devis-attempt-v1:another-client', '{broken'));
    await page.reload();
    await page.getByRole('heading', { name: 'Votre tentative ne peut pas être relue' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Envoyer ma demande de devis' }).isDisabled(), true);
    assert.equal(attempts.length, 2);
    ok('Unreadable pending request blocks a fresh submission instead of risking duplicates');
    assert.deepEqual(errors, []);
    assert.deepEqual(otherMutations, []);
    ok("No uncaught errors, checkout, payment, notification or stock mutation");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
