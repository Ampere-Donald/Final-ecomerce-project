const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { Client } = require("../../Back-end/node_modules/pg");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const site = "http://127.0.0.1:5188";
const adminSite = "http://127.0.0.1:5189";
const productId = "4cad378b-9663-47a2-b226-94dfe5a3a001";

async function main() {
  const db = new Client({
    connectionString:
      "postgresql://refonte_test@127.0.0.1:55441/newoteg_image_test",
  });
  await db.connect();
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const checks = [];
  const state = async () =>
    (
      await db.query("SELECT quantite_stock FROM produit WHERE id=$1", [
        productId,
      ])
    ).rows[0].quantite_stock;
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
      locale: "fr-FR",
    });
    const page = await context.newPage();
    const run = Date.now();
    const initialStock = await state();
    async function placeOrder(delivery, first) {
      await page.goto(site + "/product/" + productId);
      await page
        .getByRole("button", { name: "Ajouter au panier", exact: true })
        .first()
        .click();
      await page.goto(site + "/checkout");
      if (delivery) {
        await page.getByRole("radio", { name: /Livraison/ }).check();
        await page.getByLabel("Ville", { exact: true }).fill("Douala");
        await page
          .getByLabel("Quartier, adresse et repère", { exact: true })
          .fill("Adresse fictive de recette");
      }
      await page
        .getByLabel("Nom complet", { exact: true })
        .fill("Client test livraison");
      await page.getByLabel("Téléphone", { exact: true }).fill(String(run));
      if (first) {
        await page
          .getByRole("checkbox", { name: /créer un compte/i })
          .check();
        await page
          .getByLabel("Adresse e-mail", { exact: true })
          .fill(`delivery-${run}@example.invalid`);
        await page.getByLabel("Créer un mot de passe").fill("TestOnly2026!");
      }
      await page
        .getByRole("button", { name: "Vérifier ma sélection", exact: true })
        .click();
      await page.getByRole("checkbox").check();
      const pending = page.waitForResponse(
        (r) =>
          r.url().includes("/api/commandes") &&
          r.request().method() === "POST" &&
          !r.url().endsWith("/quote"),
      );
      await page
        .getByRole("button", { name: "Enregistrer ma commande", exact: true })
        .click();
      const response = await pending;
      assert.equal(response.status(), 201, await response.text());
      const result = await response.json();
      const order = result.commande || result;
      await page
        .getByRole("heading", { name: "Commande enregistrée", exact: true })
        .waitFor();
      await page
        .getByRole("link", { name: "Voir le suivi", exact: true })
        .click();
      await page
        .getByRole("heading", { name: order.numeroSuivi, exact: true })
        .waitFor();
      return order;
    }
    const delivery = await placeOrder(true, true);
    assert.equal(delivery.modeReception, "LIVRAISON");
    assert.equal(await page.getByText(/Pour un retrait, attendez/).count(), 0);
    assert.equal(await state(), initialStock - 1);
    assert.equal(
      await page
        .getByRole("button", { name: "Confirmer la réception", exact: true })
        .count(),
      0,
    );
    checks.push(
      "Commande livraison créée depuis le site ; stock débité une seule fois, réception indisponible avant expédition",
    );
    const token = await page.evaluate(() =>
      localStorage.getItem("newoteg_token"),
    );
    const early = await context.request.patch(
      site + `/api/commandes/${delivery.id}/reception`,
      { headers: { Authorization: `Bearer ${token}` }, data: {} },
    );
    assert.equal(early.status(), 400);
    checks.push("Serveur : confirmation de réception prématurée refusée");

    const admin = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "fr-FR",
    });
    const ap = await admin.newPage();
    await ap.goto(adminSite + "/orders");
    await ap.getByPlaceholder("ex. admin").fill("test_image_admin");
    await ap.getByPlaceholder("Votre mot de passe").fill("TestImageAdmin2026!");
    await ap.getByRole("button", { name: "Se connecter", exact: true }).click();
    await ap
      .getByRole("heading", { name: "Accès administrateur", exact: true })
      .waitFor({ state: "hidden" });
    await ap.goto(adminSite + "/orders");
    const row = ap.getByRole("row").filter({ hasText: delivery.numeroSuivi });
    await row.waitFor();
    const dispatched = ap.waitForResponse(
      (r) =>
        r.url().endsWith("/commandes/" + delivery.id) &&
        r.request().method() === "PATCH",
    );
    await row.getByRole("combobox").selectOption("EN_LIVRAISON");
    assert.equal((await dispatched).status(), 200);
    await page.getByRole("button", { name: "Actualiser", exact: true }).click();
    await page
      .getByRole("button", { name: "Confirmer la réception", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Annuler la commande", exact: true })
        .count(),
      0,
    );
    checks.push(
      "Expédition depuis l’administration : réception activée côté client et annulation retirée",
    );
    const blockedCancel = await context.request.patch(
      site + `/api/commandes/${delivery.id}/cancel`,
      { headers: { Authorization: `Bearer ${token}` }, data: {} },
    );
    assert.equal(blockedCancel.status(), 400);
    await page
      .getByRole("button", { name: "Confirmer la réception", exact: true })
      .click();
    const received = page.waitForResponse((r) =>
      r.url().endsWith(`/commandes/${delivery.id}/reception`),
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmer", exact: true })
      .click();
    assert.equal((await received).status(), 200);
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByText("Réception terminée", { exact: true })
      .first()
      .waitFor();
    assert.equal(
      (await db.query("SELECT statut FROM commande WHERE id=$1", [delivery.id]))
        .rows[0].statut,
      "LIVREE",
    );
    assert.equal(await state(), initialStock - 1);
    checks.push(
      "Réception confirmée par le client : statut livré persistant, stock inchangé",
    );
    await page.screenshot({
      path: path.join(
        root,
        "docs/refonte-e/captures/image-livraison-terminee-390.png",
      ),
      fullPage: true,
    });

    const cancelled = await placeOrder(false, false);
    await page.getByText(/Pour un retrait, attendez/).waitFor();
    assert.equal(await state(), initialStock - 2);
    await page
      .getByRole("button", { name: "Annuler la commande", exact: true })
      .click();
    const cancelResponse = page.waitForResponse((r) =>
      r.url().endsWith(`/commandes/${cancelled.id}/cancel`),
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmer", exact: true })
      .click();
    assert.equal((await cancelResponse).status(), 200);
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByText("Commande annulée", { exact: true }).waitFor();
    assert.equal(await state(), initialStock - 1);
    assert.equal(
      (
        await db.query("SELECT statut FROM commande WHERE id=$1", [
          cancelled.id,
        ])
      ).rows[0].statut,
      "ANNULEE",
    );
    checks.push(
      "Annulation depuis l’espace client : statut annulé et une unité remise en stock",
    );
    const repeated = await context.request.patch(
      site + `/api/commandes/${cancelled.id}/cancel`,
      { headers: { Authorization: `Bearer ${token}` }, data: {} },
    );
    assert.equal(repeated.status(), 400);
    assert.equal(await state(), initialStock - 1);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM mouvement_stock WHERE id_produit=$1 AND type_mouvement='RETOUR' AND motif=$2",
          [productId, `Annulation commande #${cancelled.numeroSuivi}`],
        )
      ).rows[0].n,
      1,
    );
    checks.push(
      "Nouvelle tentative d’annulation refusée ; un seul mouvement de retour et aucune double restitution",
    );
    await page.reload();
    await page.getByText("Commande annulée", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Annuler la commande", exact: true })
        .count(),
      0,
    );
    assert.equal(await page.getByText(/Pour un retrait, attendez/).count(), 0);
    checks.push(
      "Après rechargement : annulation persistante et action retirée",
    );
    checks.push(
      "Consigne de retrait limitée au retrait en attente, absente en livraison et après annulation",
    );
    await page.screenshot({
      path: path.join(root, "docs/refonte-e/captures/image-annulation-390.png"),
      fullPage: true,
    });
    await ap.reload();
    const cancelledRow = ap
      .getByRole("row")
      .filter({ hasText: cancelled.numeroSuivi });
    await cancelledRow.waitFor();
    assert.equal(
      await cancelledRow.getByRole("combobox").inputValue(),
      "ANNULEE",
    );
    assert.equal(await row.getByRole("combobox").inputValue(), "LIVREE");
    checks.push(
      "Administration rechargée : états livré et annulé conformes à la base",
    );
    fs.writeFileSync(
      path.join(
        root,
        "docs/refonte-e/captures/verification-livraison-annulation.json",
      ),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          success: true,
          productionTouched: false,
          externalPayments: false,
          realApi: true,
          checks,
          stock: { before: initialStock, after: await state() },
          scope:
            "Compiled site/admin against validated Linux backend image and synthetic PostgreSQL fixtures",
        },
        null,
        2,
      ),
    );
    console.log(`${checks.length} delivery/cancellation checks passed.`);
  } finally {
    await browser.close();
    await db.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
