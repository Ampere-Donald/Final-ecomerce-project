// The real API commits the first order; only its response is deliberately dropped.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const { Client } = require("../../Back-end/node_modules/pg");
function database() {
  const client = new Client({
    connectionString:
      "postgresql://refonte_test@127.0.0.1:55441/newoteg_image_test",
  });
  const ready = client.connect();
  const query = async (sql, values) => {
    await ready;
    return client.query(sql, values);
  };
  return {
    produit: {
      findUnique: async ({ where }) => {
        const r = await query(
          'SELECT quantite_stock AS "quantiteStock" FROM produit WHERE id=$1',
          [where.id],
        );
        return r.rows[0];
      },
    },
    commande: {
      count: async ({ where }) => {
        const r = await query(
          "SELECT count(*)::int AS n FROM commande WHERE client_id=$1",
          [where.clientId],
        );
        return r.rows[0].n;
      },
    },
    $disconnect: async () => {
      await ready;
      await client.end();
    },
  };
}
async function main() {
  const db = database();
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
      locale: "fr-FR",
    });
    const page = await context.newPage();
    const exampleId = "4cad378b-9663-47a2-b226-94dfe5a3a001";
    const observedApi = new Set();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (req) => {
      if (req.url().includes("/api/"))
        observedApi.add(new URL(req.url()).origin);
    });
    const before = await db.produit.findUnique({ where: { id: exampleId } });
    let firstOrder,
      firstKey,
      submitted = 0;
    await context.route(
      "http://127.0.0.1:5188/api/commandes/checkout",
      async (route) => {
        submitted++;
        if (submitted === 1) {
          firstKey = route.request().postDataJSON().requestId;
          const response = await route.fetch({ maxRetries: 0 });
          assert.equal(response.status(), 201);
          firstOrder = (await response.json()).commande;
          await route.abort("connectionreset");
        } else {
          assert.equal(route.request().postDataJSON().requestId, firstKey);
          await route.continue();
        }
      },
    );
    await page.goto("http://127.0.0.1:5188/product/" + exampleId);
    await page
      .getByRole("button", { name: "Ajouter au panier", exact: true })
      .first()
      .click();
    await page.goto("http://127.0.0.1:5188/panier");
    await page
      .getByRole("heading", { name: "Votre panier", exact: true })
      .waitFor();
    await page.getByText("TEST image active", { exact: true }).waitFor();
    await page.goto("http://127.0.0.1:5188/checkout");
    const run = Date.now();
    await page
      .getByLabel("Nom complet", { exact: true })
      .fill("Test coupure réseau");
    await page.getByLabel("Téléphone", { exact: true }).fill(String(run));
    await page
      .getByRole("checkbox", { name: /créer un compte/i })
      .check();
    await page
      .getByLabel("Adresse e-mail", { exact: true })
      .fill(`recovery-${run}@example.invalid`);
    await page.getByLabel("Créer un mot de passe").fill("TestOnly2026!");
    await page
      .getByRole("button", { name: "Vérifier ma sélection", exact: true })
      .click();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Enregistrer ma commande", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Reprendre votre commande" })
      .waitFor();
    assert.ok(firstOrder?.id);
    const persisted = await page.evaluate(() =>
      sessionStorage.getItem("newoteg_order_attempt_v1"),
    );
    assert.ok(
      !persisted.includes("TestOnly2026!") && !persisted.includes("motDePasse"),
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: exampleId } })).quantiteStock,
      before.quantiteStock - 1,
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Reprendre votre commande" })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Mot de passe choisi pour cette commande")
        .inputValue(),
      "",
    );
    await page.screenshot({
      path: path.join(root, "docs/refonte-e/captures/image-reprise-390.png"),
      fullPage: true,
    });
    await page
      .getByLabel("Mot de passe choisi pour cette commande")
      .fill("incorrect");
    await page
      .getByRole("button", { name: "Reprendre cette tentative", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await page
      .getByRole("heading", { name: "Reprendre votre commande" })
      .waitFor();
    assert.equal(
      JSON.parse(
        await page.evaluate(() =>
          sessionStorage.getItem("newoteg_order_attempt_v1"),
        ),
      ).payload.requestId,
      firstKey,
    );
    await page
      .getByLabel("Mot de passe choisi pour cette commande")
      .fill("TestOnly2026!");
    await page
      .getByRole("button", { name: "Reprendre cette tentative", exact: true })
      .click();
    await page.getByRole("heading", { name: "Commande enregistrée" }).waitFor();
    await page.getByText(firstOrder.numeroSuivi, { exact: true }).waitFor();
    assert.equal(submitted, 3);
    assert.equal(
      await db.commande.count({ where: { clientId: firstOrder.clientId } }),
      1,
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: exampleId } })).quantiteStock,
      before.quantiteStock - 1,
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("newoteg_order_attempt_v1"),
      ),
      null,
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("newoteg_cart")).length,
      ),
      0,
    );
    await page
      .getByRole("link", { name: "Voir le suivi", exact: true })
      .click();
    await page
      .getByRole("heading", { name: firstOrder.numeroSuivi, exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(root, "docs/refonte-e/captures/image-suivi-390.png"),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, "Mobile horizontal overflow");
    assert.deepEqual([...observedApi], ["http://127.0.0.1:5188"]);
    assert.deepEqual(errors, []);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("http://127.0.0.1:5188/catalogue");
    await page
      .getByRole("heading", { name: "Produits électroniques", exact: true })
      .waitFor();
    await page.getByText("TEST image active", { exact: true }).waitFor();
    assert.equal(
      await page.getByText("TEST image archive", { exact: true }).count(),
      0,
    );
    await page.screenshot({
      path: path.join(root, "docs/refonte-e/captures/image-catalogue-1440.png"),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const loginContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "fr-FR",
    });
    const loginPage = await loginContext.newPage();
    await loginPage.goto("http://127.0.0.1:5188/login");
    await loginPage
      .getByLabel("E-mail ou téléphone", { exact: true })
      .fill(`recovery-${run}@example.invalid`);
    await loginPage
      .getByLabel("Mot de passe", { exact: true })
      .fill("TestOnly2026!");
    await loginPage
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await loginPage.waitForURL("**/profile");
    await loginPage
      .getByRole("heading", { name: "Mon compte", exact: true })
      .waitFor();
    await loginPage.goto("http://127.0.0.1:5188/commandes");
    await loginPage
      .getByRole("link", { name: firstOrder.numeroSuivi, exact: true })
      .waitFor();
    await loginPage.screenshot({
      path: path.join(root, "docs/refonte-e/captures/image-commandes-1440.png"),
      fullPage: true,
    });
    await loginContext.close();
    fs.writeFileSync(
      path.join(root, "docs/refonte-e/captures/verification-site-image.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          realApi: true,
          backendImage:
            "sha256:28762f2fdcae9e93deb570f93dac2ae2e40719d31a9508e4be738a2c3343d071",
          frontend: "Vite production build with local API proxy on 5188",
          database: "newoteg_image_test / PostgreSQL 18.6 Linux",
          productionTouched: false,
          remoteAI: false,
          browserErrors: errors,
          apiOrigins: [...observedApi],
          fault: "response dropped after real commit",
          checks: [
            "Reprise après rechargement avec le même identifiant",
            "Mot de passe absent du stockage de reprise",
            "Erreur de validation au réessai : identifiant initial conservé",
            "Une commande et un seul débit de stock",
            "Confirmation initiale et suivi authentifié retrouvés",
            "Panier rempli affiché, puis vidé à la confirmation et tentative terminée",
            "Nouvelle session desktop : connexion par mot de passe et commande retrouvée",
            "Suivi mobile à 390 px sans débordement horizontal",
            "Catalogue desktop à 1440 px : actif visible, archivé absent, sans débordement",
            "Parcours mobile : aucune erreur JavaScript non gérée et requêtes API exclusivement locales",
          ],
        },
        null,
        2,
      ),
    );
    console.log("Lost response + page reload + real order recovery passed.");
  } finally {
    await browser.close();
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
