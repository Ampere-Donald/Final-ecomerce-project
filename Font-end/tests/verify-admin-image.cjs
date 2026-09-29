const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { Client } = require("../../Back-end/node_modules/pg");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
async function main() {
  const db = new Client({
    connectionString:
      "postgresql://refonte_test@127.0.0.1:55441/newoteg_image_test",
  });
  await db.connect();
  const bcrypt = require("../../Back-end/node_modules/bcrypt");
  await db.query(
    "INSERT INTO admin_user(id,username,nom,mot_de_passe,role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(username) DO NOTHING",
    [
      require("node:crypto").randomUUID(),
      "test_image_admin",
      "Administrateur test local",
      await bcrypt.hash("TestImageAdmin2026!", 12),
      "ADMIN",
    ],
  );
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const order = (
      await db.query(
        "SELECT c.id,c.numero_suivi,cl.email FROM commande c JOIN client cl ON cl.id=c.client_id WHERE c.statut='EN_ATTENTE' AND cl.email LIKE 'recovery-%@example.invalid' ORDER BY c.date_commande DESC LIMIT 1",
      )
    ).rows[0];
    assert.ok(order, "Run the built-site checkout test first");
    const stock = async () =>
      (
        await db.query(
          "SELECT quantite_stock FROM produit WHERE id='4cad378b-9663-47a2-b226-94dfe5a3a001'",
        )
      ).rows[0].quantite_stock;
    const before = await stock();
    const checks = [];
    const admin = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "fr-FR",
    });
    const p = await admin.newPage();
    await p.goto("http://127.0.0.1:5189/orders");
    await p.getByPlaceholder("ex. admin").fill("test_image_admin");
    await p.getByPlaceholder("Votre mot de passe").fill("TestImageAdmin2026!");
    await p.getByRole("button", { name: "Se connecter", exact: true }).click();
    await p
      .getByRole("heading", { name: "Accès administrateur", exact: true })
      .waitFor({ state: "hidden" });
    await p.goto("http://127.0.0.1:5189/orders");
    await p
      .getByRole("heading", { name: "Commandes E-commerce", exact: true })
      .waitFor();
    const row = p.getByRole("row").filter({ hasText: order.numero_suivi });
    await row.waitFor();
    assert.equal(await row.count(), 1);
    checks.push(
      "Connexion administrateur réelle et commande du site retrouvée",
    );
    await row.getByRole("button", { name: "Retrait", exact: true }).click();
    const confirm = p.getByRole("button", {
      name: "Confirmer le retrait",
      exact: true,
    });
    assert.equal(await confirm.isEnabled(), false);
    await p.getByRole("checkbox").check();
    assert.equal(await confirm.isEnabled(), true);
    checks.push("Retrait bloqué avant vérification des articles");
    const responsePromise = p.waitForResponse(
      (r) =>
        r.url().endsWith(`/commandes/${order.id}/pickup`) &&
        r.request().method() === "PATCH",
    );
    await confirm.click();
    const response = await responsePromise;
    assert.equal(response.status(), 200, await response.text());
    await p
      .getByText("Traiter le retrait", { exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(
      (await db.query("SELECT statut FROM commande WHERE id=$1", [order.id]))
        .rows[0].statut,
      "LIVREE",
    );
    assert.equal(await stock(), before);
    checks.push(
      "Retrait enregistré dans PostgreSQL, sans nouveau débit de stock",
    );
    const actual = await row.getByRole("combobox").inputValue();
    fs.writeFileSync(
      path.join(
        root,
        ".local-postgres/refonte-e/integrated-admin/last-check.json",
      ),
      JSON.stringify({
        orderId: order.id,
        statusShown: actual,
        expected: "LIVREE",
      }),
    );
    assert.equal(
      actual,
      "LIVREE",
      "Admin status selector misrepresents delivered order",
    );
    assert.equal(await row.getByRole("combobox").isEnabled(), false);
    checks.push(
      "Statut livré affiché correctement et protégé contre un retour accidentel en attente",
    );
    await p.screenshot({
      path: path.join(
        root,
        "docs/refonte-e/captures/image-admin-retrait-1440.png",
      ),
      fullPage: true,
    });
    const client = await browser.newContext({
      viewport: { width: 390, height: 900 },
      locale: "fr-FR",
    });
    const cp = await client.newPage();
    await cp.goto("http://127.0.0.1:5188/login");
    await cp
      .getByLabel("E-mail ou téléphone", { exact: true })
      .fill(order.email);
    await cp.getByLabel("Mot de passe", { exact: true }).fill("TestOnly2026!");
    await cp.getByRole("button", { name: "Se connecter", exact: true }).click();
    await cp.waitForURL("**/profile");
    await cp.goto(`http://127.0.0.1:5188/commandes/${order.id}`);
    await cp
      .getByRole("heading", { name: order.numero_suivi, exact: true })
      .waitFor();
    await cp.getByText("Réception terminée", { exact: true }).first().waitFor();
    assert.equal(
      await cp
        .getByRole("button", { name: "Annuler la commande", exact: true })
        .count(),
      0,
    );
    checks.push("Espace client : réception terminée et annulation retirée");
    await cp.screenshot({
      path: path.join(
        root,
        "docs/refonte-e/captures/image-client-retrait-390.png",
      ),
      fullPage: true,
    });
    fs.writeFileSync(
      path.join(root, "docs/refonte-e/captures/verification-admin-image.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          success: true,
          productionTouched: false,
          realApi: true,
          payment: "Synthetic PREPAYE selection; no payment provider contacted",
          checks,
        },
        null,
        2,
      ),
    );
    console.log(`${checks.length} admin/client checks passed.`);
  } finally {
    await browser.close();
    await db.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
