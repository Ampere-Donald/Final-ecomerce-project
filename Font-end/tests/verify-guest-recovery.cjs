// Lost-response guest recipe: every API request is intercepted.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const base = "http://127.0.0.1:5186";
const product = {
  id: "guest-product",
  estActif: true,
  nomProduit: "Câble de démonstration",
  prixDetail: 3500,
  quantiteStock: 5,
  imageUrl: base + "/design-e/hdmi-5m.webp",
};
const attempts = [],
  errors = [];
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
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("https://accounts.google.com/**", (route) =>
      route.abort(),
    );
    await context.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const send = (data) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (pathname === "/api/produits/guest-product") return send(product);
      if (pathname === "/api/produits")
        return send({ data: [product], meta: { total: 1, lastPage: 1 } });
      if (pathname === "/api/commandes/quote")
        return send({
          requestProtocol: 1,
          montantArticles: 3500,
          fraisLivraison: null,
          lignes: [
            {
              produitId: product.id,
              nomProduit: product.nomProduit,
              quantite: 1,
              prixUnitaire: 3500,
            },
          ],
        });
      if (pathname === "/api/commandes/checkout") {
        attempts.push(route.request().postDataJSON());
        if (attempts.length === 1) return route.abort("failed");
        return send({
          commande: { id: "guest-order", numeroSuivi: "DEMO-GUEST-REPLAY" },
        });
      }
      return send([]);
    });
    await page.goto(base + "/product/guest-product");
    await page
      .getByRole("button", { name: "Ajouter au panier", exact: true })
      .first()
      .click();
    await page.goto(base + "/checkout");
    await page
      .getByLabel("Nom complet", { exact: true })
      .fill("Client Démonstration");
    await page.getByLabel("Téléphone", { exact: true }).fill("600000000");
    await page
      .getByRole("button", { name: "Vérifier ma sélection", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Une dernière vérification" })
      .waitFor();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Enregistrer ma commande", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Reprendre votre commande" })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Reprendre votre commande" })
      .waitFor();
    assert.equal(await page.locator("input[type=password]").count(), 0);
    await page
      .getByRole("button", { name: "Reprendre cette tentative", exact: true })
      .click();
    await page.getByRole("heading", { name: "Commande enregistrée" }).waitFor();
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[0], attempts[1]);
    assert.equal(attempts[0].email, undefined);
    assert.equal(attempts[0].motDePasse, undefined);
    assert.equal(
      await page
        .getByRole("link", { name: "Voir le suivi", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS Guest resumes the identical request after a lost response and reload without an email or password",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
