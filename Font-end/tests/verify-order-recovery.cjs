// The real API commits the first order; only its response is deliberately dropped.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  database,
  root,
  runtime,
} = require("../../Back-end/test/sandbox/config.cjs");
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
    const { exampleId } = JSON.parse(
      fs.readFileSync(path.join(runtime, "seed-report.json")),
    );
    const before = await db.produit.findUnique({ where: { id: exampleId } });
    let firstOrder,
      firstKey,
      submitted = 0;
    await context.route(
      "http://127.0.0.1:3016/api/commandes/checkout",
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
    await page.goto("http://127.0.0.1:5187/product/" + exampleId);
    await page
      .getByRole("button", { name: "Ajouter au panier", exact: true })
      .first()
      .click();
    await page.goto("http://127.0.0.1:5187/checkout");
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
      path: path.join(root, "docs/refonte-e/captures/reprise-commande-390.png"),
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
    fs.writeFileSync(
      path.join(
        root,
        "docs/refonte-e/captures/verification-reprise-navigateur.json",
      ),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          realApi: true,
          fault: "response dropped after real commit",
          checks: [
            "Reprise après rechargement avec le même identifiant",
            "Mot de passe absent du stockage de reprise",
            "Erreur de validation au réessai : identifiant initial conservé",
            "Une commande et un seul débit de stock",
            "Confirmation initiale et suivi authentifié retrouvés",
            "Panier vidé et tentative terminée",
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
