// No API interception. Every order goes to the isolated PostgreSQL test cluster.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { database, runtime } = require("../../Back-end/test/sandbox/config.cjs");
const base = "http://127.0.0.1:5187";
const out = path.resolve(__dirname, "../../docs/refonte-e/captures");
async function main() {
  assert.equal(
    (await (await fetch("http://127.0.0.1:3016/sandbox-health")).json())
      .sandbox,
    "refonte-e",
  );
  const { exampleId } = JSON.parse(
    fs.readFileSync(path.join(runtime, "seed-report.json")),
  );
  const db = database();
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const checks = [],
    errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
      locale: "fr-FR",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        request.url().includes("/api/") &&
        !request.url().startsWith("http://127.0.0.1:3016/")
      )
        errors.push("Unexpected API origin: " + new URL(request.url()).origin);
    });
    async function snap(name, width) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(async img => {
          img.loading = 'eager';
          await Promise.race([img.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 8000))]);
        }));
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Overflow ${name}/${width}`,
      );
      await page.screenshot({
        path: path.join(out, `serveur-reel-${name}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
    const before = await db.produit.findUnique({ where: { id: exampleId } });
    await page.goto(`${base}/product/${exampleId}`);
    await page
      .getByRole("button", { name: "Ajouter au panier", exact: true })
      .first()
      .waitFor();
    await page.getByText(/Environnement de test · Prix et stocks/).waitFor();
    await snap("produit", 390);
    await page
      .getByRole("button", { name: "Ajouter au panier", exact: true })
      .first()
      .click();
    await page.goto(base + "/checkout");
    const run = Date.now();
    await page
      .getByLabel("Nom complet", { exact: true })
      .fill("Client de test navigateur");
    await page.getByLabel("Téléphone", { exact: true }).fill(String(run));
    await page
      .getByRole("checkbox", { name: /créer un compte/i })
      .check();
    await page
      .getByLabel("Adresse e-mail", { exact: true })
      .fill(`browser-${run}@example.invalid`);
    await page.getByLabel("Créer un mot de passe").fill("TestOnly2026!");
    await page
      .getByRole("button", { name: "Vérifier ma sélection", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Une dernière vérification" })
      .waitFor();
    await snap("verification", 390);
    await page.getByRole("checkbox").check();
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/commandes/checkout") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Enregistrer ma commande", exact: true })
      .click();
    const response = await saved;
    assert.equal(response.status(), 201);
    const { commande } = await response.json();
    await page.getByRole("heading", { name: "Commande enregistrée" }).waitFor();
    assert.equal(await db.commande.count({ where: { id: commande.id } }), 1);
    assert.equal(
      (await db.produit.findUnique({ where: { id: exampleId } })).quantiteStock,
      before.quantiteStock - 1,
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("newoteg_cart")).length,
      ),
      0,
    );
    checks.push(
      "Produit catalogue → panier → devis serveur → compte → commande persistée → stock -1 → panier vidé",
    );
    await snap("confirmation", 390);
    await snap("confirmation", 1440);
    await page
      .getByRole("link", { name: "Voir le suivi", exact: true })
      .click();
    await page
      .getByRole("heading", { name: commande.numeroSuivi, exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: commande.numeroSuivi, exact: true })
      .waitFor();
    checks.push("Suivi de la commande depuis le compte et après rechargement");
    await snap("suivi", 390);
    await page.goto(base + "/catalogue");
    await page.locator(".e-card").first().waitFor();
    await snap("catalogue", 1440);
    await snap("catalogue", 390);
    checks.push("Catalogue réel desktop et mobile sans débordement");
    await page.goto(base + "/equivalences");
    await page.locator("#equivalence-query").fill("PT DE DIODE");
    const equivalents = page.waitForResponse(response => response.url().endsWith("/api/equivalence/suggest") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Rechercher un équivalent", exact: true }).click();
    assert.equal((await equivalents).status(), 201);
    await page.locator(".e-equivalent").first().waitFor();
    await snap("equivalences", 390);
    await snap("equivalences", 1440);
    checks.push("Équivalences : recherche explicite raccordée au serveur, repli catalogue affiché");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "verification-navigateur-api-reelle.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          environment: base,
          apiMocked: false,
          checks,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "Live browser journey passed. No API mocking, no production writes.",
    );
  } finally {
    await browser.close();
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
