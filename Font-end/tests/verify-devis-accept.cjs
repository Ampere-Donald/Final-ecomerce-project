// Isolated UI recipe: all APIs mocked, no real order, stock, payment or notification.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://127.0.0.1:5186";
const user = {
  id: "client-fixture",
  nom: "Client Démonstration",
  telephone: "+237600000000",
};
const fresh = () => ({
  id: "quote-fixture",
  nomClient: user.nom,
  telephone: user.telephone,
  modeReception: "LIVRAISON",
  destination: "Douala · adresse de démonstration",
  statut: "ENVOYEE",
  version: 2,
  createdAt: new Date().toISOString(),
  lignes: [
    {
      reference: "LM358-N",
      nomProduit: "Amplificateur LM358-N",
      quantite: 2,
      produitId: "product-fixture",
    },
  ],
  offre: {
    numero: "FP-DEMO",
    dateExpiration: new Date(Date.now() + 86400000).toISOString(),
    montantArticles: 3000,
    fraisLivraison: null,
    reservationStock: false,
    lignes: [
      {
        produitId: "product-fixture",
        nomProduit: "Amplificateur LM358-N",
        quantite: 2,
        prixUnitaire: 1500,
        sousTotal: 3000,
      },
    ],
  },
});
const key = "newoteg-devis-accept-v1:client-fixture:quote-fixture";
const errors = [],
  mutations = [],
  attempts = [];
let request = fresh(),
  mode = "lost",
  replayed = false;
const ok = (name) => console.log("PASS " + name);
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
    await context.route("**/*", (r) =>
      new URL(r.request().url()).origin === base ? r.continue() : r.abort(),
    );
    await context.route("**/api/**", async (r) => {
      const u = new URL(r.request().url()),
        method = r.request().method();
      const send = (data, status = 200) =>
        r.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (u.pathname.endsWith("/auth/me")) return send(user);
      if (u.pathname.endsWith("/devis/mine/quote-fixture") && method === "GET")
        return send(request);
      if (u.pathname.endsWith("/devis/mine/quote-fixture/accepter")) {
        const payload = r.request().postDataJSON();
        attempts.push(payload);
        assert.equal(
          r.request().headers().authorization,
          "Bearer fixture-only",
        );
        assert.deepEqual(Object.keys(payload).sort(), [
          "conditionsAcceptees",
          "requestId",
          "version",
        ]);
        assert.equal(payload.conditionsAcceptees, true);
        if (mode === "lost") {
          mode = "ok";
          replayed = true;
          return r.abort("failed");
        }
        if (mode === "conflict") {
          mode = "ok";
          request.version = 4;
          request.offre.montantArticles = 3200;
          request.offre.lignes[0].prixUnitaire = 1600;
          request.offre.lignes[0].sousTotal = 3200;
          return send(
            { message: "La proposition a changé. Relisez votre demande." },
            409,
          );
        }
        if (mode === "401") {
          mode = "ok";
          return send({ message: "Reconnectez-vous." }, 401);
        }
        const commande = {
          id: "order-fixture",
          numeroSuivi: "CMD-DEMO",
          statut: "EN_ATTENTE",
          montantTotal: request.offre.montantArticles,
          modeReception: request.modeReception,
        };
        request = {
          ...request,
          statut: "ACCEPTEE",
          version: request.version + 1,
          acceptedVersion: payload.version,
          commande,
          numeroCommande: commande.numeroSuivi,
        };
        return send({ demandeId: request.id, commande, replayed });
      }
      if (!["GET", "OPTIONS"].includes(method)) mutations.push(u.pathname);
      if (u.pathname.endsWith("/devis/mine")) return send([request]);
      return send([], 200);
    });
    await context.addInitScript((user) => {
      if (!localStorage.getItem("newoteg_token")) {
        localStorage.setItem("newoteg_token", "fixture-only");
        localStorage.setItem("newoteg_user", JSON.stringify(user));
      }
    }, user);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const open = async () => {
      await page.goto(base + "/mes-devis/quote-fixture");
      await page
        .getByRole("heading", { name: "Votre demande de devis", exact: true })
        .waitFor();
    };
    await open();
    const button = () =>
      page.getByRole("button", { name: "Créer ma commande à valider" });
    await button().waitFor();
    assert.equal(await button().isDisabled(), true);
    const offer = page.getByRole("region", {
      name: "Proposition de la boutique",
    });
    assert.match(await offer.innerText(), /3\s?000.*FCFA/s);
    assert.match(await offer.innerText(), /frais et délai à confirmer/);
    ok("Commercial offer and delivery terms are visible; consent is required");
    const output = path.resolve(__dirname, "../../../..", "Documents");
    const captures =
      process.env.NEWOTEG_TEST_CAPTURES ||
      "C:/Users/pc/Documents/Newoteg/output/implementation-work/captures";
    fs.mkdirSync(captures, { recursive: true });
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await offer.scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: path.join(captures, `devis-accept-${width}.png`),
        });
    }
    ok("Offer and confirmation stay within the viewport at four widths");
    await page.getByRole("checkbox").check();
    await button().click();
    await page.getByRole("alert").waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Reprendre la même confirmation" })
      .click();
    await page
      .getByRole("heading", { name: "Votre commande est enregistrée" })
      .waitFor();
    assert.deepEqual(attempts[1], attempts[0]);
    assert.equal(
      await page
        .getByRole("link", { name: "Voir le suivi de ma commande" })
        .getAttribute("href"),
      "/commandes/order-fixture",
    );
    assert.equal(
      await page.evaluate((key) => sessionStorage.getItem(key), key),
      null,
    );
    ok(
      "Lost reply and reload reuse the same UUID and version, then show private tracking",
    );
    request = fresh();
    mode = "conflict";
    replayed = false;
    await open();
    await page.getByRole("checkbox").check();
    await button().click();
    await page.getByRole("button", { name: "Relire la proposition" }).waitFor();
    assert.equal(await button().count(), 0);
    await page.getByRole("button", { name: "Relire la proposition" }).click();
    await button().waitFor();
    assert.equal(await button().isDisabled(), true);
    assert.match(await offer.innerText(), /3\s?200.*FCFA/s);
    await page.getByRole("checkbox").check();
    await button().click();
    await page
      .getByRole("heading", { name: "Votre commande est enregistrée" })
      .waitFor();
    assert.equal(attempts.at(-1).version, 4);
    assert.notEqual(attempts.at(-1).requestId, attempts.at(-2).requestId);
    ok(
      "Changed offer requires an authoritative reload and new explicit confirmation",
    );
    request = fresh();
    request.offre.dateExpiration = new Date(0).toISOString();
    await open();
    await offer.waitFor();
    assert.equal(await button().count(), 0);
    ok("Expired offer cannot be accepted");
    request = {
      ...fresh(),
      statut: "ACCEPTEE",
      numeroCommande: "CMD-DELETED",
      acceptedVersion: 2,
      commande: null,
    };
    await open();
    await page.getByText("CMD-DELETED", { exact: true }).waitFor();
    assert.equal(await button().count(), 0);
    assert.equal(
      await page
        .getByRole("link", { name: "Voir le suivi de ma commande" })
        .count(),
      0,
    );
    ok(
      "Deleted order retains its historical number and offers contact without recreating it",
    );
    request = fresh();
    await page.evaluate((key) => sessionStorage.setItem(key, "{broken"), key);
    await page.reload();
    await page
      .getByRole("heading", { name: "Votre tentative ne peut pas être relue" })
      .waitFor();
    assert.equal(await button().count(), 0);
    ok("Unreadable recovery blocks fresh acceptance");
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    ok("No uncaught errors or unrelated mutation");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
