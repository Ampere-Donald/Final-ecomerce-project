// Local UI recipe: intercepts every API and refuses all external traffic.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = "http://127.0.0.1:5187",
  out = "C:/Users/pc/Documents/Newoteg/output/implementation-work/captures";
fs.mkdirSync(out, { recursive: true });
const product = {
  id: "qa-advice",
  estActif: true,
  code: "HDMI-A-5M",
  nomProduit: "Câble HDMI mâle / mâle",
  designationEn: "HDMI male / male cable",
  prixDetail: 3500,
  quantiteStock: 12,
  imageUrl: base + "/design-e/hdmi-5m.webp",
  categorie: { nom: "Connectique" },
  attributs: [{ nomAttribut: "Longueur", valeurs: [{ valeur: "5 m" }] }],
};
const errors = [],
  methods = [],
  outside = [],
  mutations = [];
let holdQuote = false,
  releaseQuote;
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "fr-FR",
    });
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : (outside.push(route.request().url()), route.abort()),
    );
    await context.route("**/api/**", async (route) => {
      methods.push(route.request().method());
      const u = new URL(route.request().url());
      if (route.request().method() !== "GET") mutations.push(u.pathname);
      if (u.pathname.endsWith("/commandes/quote")) {
        if (holdQuote)
          await new Promise((resolve) => {
            releaseQuote = resolve;
          });
        const lines = route
          .request()
          .postDataJSON()
          .lignes.map((line) => ({
            ...line,
            nomProduit: product.nomProduit,
            prixUnitaire: 3500,
            sousTotal: line.quantite * 3500,
          }));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            requestProtocol: 1,
            lignes: lines,
            montantArticles: lines.reduce(
              (sum, line) => sum + line.sousTotal,
              0,
            ),
            fraisLivraison: null,
          }),
        });
      }
      const data = u.pathname.endsWith("/produits/qa-advice")
        ? product
        : u.pathname.endsWith("/produits")
          ? { data: [product], meta: { total: 1, lastPage: 1 } }
          : [];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    await context.addInitScript(() => {
      if (!localStorage.getItem("appLang"))
        localStorage.setItem("appLang", "fr");
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/product/qa-advice?tracking=private#secret");
    await page
      .getByRole("heading", { name: product.nomProduit, exact: true })
      .waitFor();
    for (let i = 0; i < 2; i++)
      await page
        .getByRole("button", { name: "Augmenter la quantité", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Conseil sur cette pièce", exact: true })
      .click();
    const advice = page.getByRole("dialog", {
      name: "Parlons de votre pièce",
      exact: true,
    });
    const question = advice.getByLabel("Votre message à la boutique", {
      exact: true,
    });
    assert.match(await question.inputValue(), /HDMI-A-5M/);
    assert.match(await question.inputValue(), /Quantité souhaitée : 3/);
    assert.doesNotMatch(await question.inputValue(), /tracking|private|secret/);
    const text =
      "Bonjour, mon montage utilise 3.3V & ce connecteur. Compatible ?";
    await question.fill(text);
    const href = await advice
      .getByRole("link", {
        name: "Ouvrir ce message dans WhatsApp",
        exact: true,
      })
      .getAttribute("href");
    assert.equal(new URL(href).searchParams.get("text"), text);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: path.join(out, "conseil-piece-mobile.png") });
    await question.fill("");
    assert.equal(
      await advice
        .getByRole("button", { name: "Écrivez votre message", exact: true })
        .isDisabled(),
      true,
    );
    await page.keyboard.press("Escape");
    await advice.waitFor({ state: "hidden" });
    assert.equal(
      await page
        .getByRole("button", { name: "Conseil sur cette pièce", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    console.log(
      "PASS editable contextual advice, exact suffix and quantity, clean URL, no outgoing message, Escape focus recovery",
    );
    const header = page.getByRole("banner");
    await header
      .getByRole("button", {
        name: "Choisir la réception : Retrait à Akwa",
        exact: true,
      })
      .click();
    const reception = page.getByRole("dialog", {
      name: "Comment recevoir vos articles ?",
      exact: true,
    });
    await reception
      .getByRole("radio", { name: "Demander une livraison", exact: true })
      .check();
    await reception
      .getByLabel("Ville de livraison", { exact: true })
      .fill("Yaoundé");
    await page.screenshot({
      path: path.join(out, "reception-choix-mobile.png"),
    });
    await reception
      .getByRole("button", { name: "Appliquer mon choix", exact: true })
      .click();
    await reception.waitFor({ state: "hidden" });
    await page
      .getByRole("heading", {
        name: "Livraison demandée à Yaoundé",
        exact: true,
      })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", {
        name: "Livraison demandée à Yaoundé",
        exact: true,
      })
      .waitFor();
    const main = page.getByRole("main");
    await main
      .locator(".e-product-info")
      .getByRole("button", { name: "Ajouter au panier", exact: true })
      .click();
    await page.goto(base + "/panier");
    await page
      .getByRole("heading", {
        name: "Livraison demandée à Yaoundé",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("link", { name: "Choisir la réception", exact: true })
      .click();
    await page.getByLabel("Ville", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Ville", { exact: true }).inputValue(),
      "Yaoundé",
    );
    assert.equal(
      await page.getByRole("radio", { name: /Livraison/ }).isChecked(),
      true,
    );
    await page.getByLabel("Nom complet", { exact: true }).fill("Client Test");
    await page
      .getByRole("banner")
      .getByRole("button", {
        name: "Choisir la réception : Livraison : Yaoundé",
        exact: true,
      })
      .click();
    await reception
      .getByRole("radio", { name: "Retrait à Akwa, Douala", exact: true })
      .check();
    await reception
      .getByRole("button", { name: "Appliquer mon choix", exact: true })
      .click();
    assert.equal(
      await page.getByRole("radio", { name: /Retrait à Akwa/ }).isChecked(),
      true,
    );
    assert.equal(
      await page.getByLabel("Nom complet", { exact: true }).inputValue(),
      "Client Test",
    );
    assert.equal(await page.getByLabel("Ville", { exact: true }).count(), 0);
    console.log(
      "PASS optional reception persists through reload, product, cart and checkout; header change preserves contact details",
    );
    await page.getByLabel("Téléphone", { exact: true }).fill("600000000");
    await page
      .getByRole("button", { name: "Vérifier ma sélection", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Une dernière vérification", exact: true })
      .waitFor();
    await page.getByRole("checkbox").check();
    assert.equal(
      await page
        .getByRole("button", { name: "Enregistrer ma commande", exact: true })
        .isEnabled(),
      true,
    );
    await page
      .getByRole("banner")
      .getByRole("button", {
        name: "Choisir la réception : Retrait à Akwa",
        exact: true,
      })
      .click();
    await reception
      .getByRole("radio", { name: "Demander une livraison", exact: true })
      .check();
    await reception
      .getByLabel("Ville de livraison", { exact: true })
      .fill("Douala");
    await reception
      .getByRole("button", { name: "Appliquer mon choix", exact: true })
      .click();
    await page
      .getByLabel("Quartier, adresse et repère", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Enregistrer ma commande", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page.getByLabel("Nom complet", { exact: true }).inputValue(),
      "Client Test",
    );
    console.log(
      "PASS changing reception during review requires renewed consent and cannot submit the old acceptance",
    );
    await page
      .getByLabel("Quartier, adresse et repère", { exact: true })
      .fill("Adresse fictive de test");
    holdQuote = true;
    const requested = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/api/commandes/quote",
    );
    await page
      .getByRole("button", { name: "Vérifier ma sélection", exact: true })
      .click();
    await requested;
    await page
      .getByRole("banner")
      .getByRole("button", {
        name: "Choisir la réception : Livraison : Douala",
        exact: true,
      })
      .click();
    await reception
      .getByRole("radio", { name: "Retrait à Akwa, Douala", exact: true })
      .check();
    await reception
      .getByRole("button", { name: "Appliquer mon choix", exact: true })
      .click();
    releaseQuote();
    holdQuote = false;
    await page.getByRole("alert").waitFor();
    assert.match(
      await page.getByRole("alert").innerText(),
      /Votre réception a changé pendant la vérification/,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Enregistrer ma commande", exact: true })
        .count(),
      0,
    );
    console.log(
      "PASS a delayed quote cannot reopen review after the reception has changed",
    );
    for (const width of [360, 390, 768, 1100, 1240, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + "/product/qa-advice");
      await page
        .getByRole("heading", { name: product.nomProduit, exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "overflow " + width,
      );
      if (width === 360 || width === 1440)
        await page.screenshot({
          path: path.join(out, "fiche-conseil-" + width + ".png"),
          fullPage: true,
        });
    }
    await page.evaluate(() => localStorage.setItem("appLang", "en"));
    await page.reload();
    await page
      .getByRole("button", { name: "Advice about this part", exact: true })
      .click();
    assert.match(
      await page
        .getByLabel("Your message to the shop", { exact: true })
        .inputValue(),
      /Product: HDMI male/,
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
      localStorage.setItem("newoteg_reception_v1", "{broken"),
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Pickup at Akwa, Douala", exact: true })
      .waitFor();
    console.log(
      "PASS six responsive widths, English advice and corrupt-storage fallback",
    );
    assert.deepEqual(mutations, [
      "/api/commandes/quote",
      "/api/commandes/quote",
    ]);
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(
      outside.some((url) => url.startsWith("https://wa.me")),
      false,
    );
    await context.close();
    const blocked = await browser.newContext({
      viewport: { width: 390, height: 900 },
      locale: "fr-FR",
    });
    await blocked.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    await blocked.route("**/api/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          new URL(route.request().url()).pathname.endsWith(
            "/produits/qa-advice",
          )
            ? product
            : { data: [product] },
        ),
      }),
    );
    await blocked.addInitScript(() => {
      localStorage.setItem("appLang", "fr");
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "newoteg_reception_v1") throw new Error("blocked");
        return original.call(this, key, value);
      };
    });
    const b = await blocked.newPage();
    await b.goto(base + "/product/qa-advice");
    await b
      .getByRole("banner")
      .getByRole("button", {
        name: "Choisir la réception : Retrait à Akwa",
        exact: true,
      })
      .click();
    const d = b.getByRole("dialog", {
      name: "Comment recevoir vos articles ?",
      exact: true,
    });
    await d
      .getByRole("radio", { name: "Demander une livraison", exact: true })
      .check();
    await d.getByLabel("Ville de livraison", { exact: true }).fill("Bafoussam");
    await d
      .getByRole("button", { name: "Appliquer mon choix", exact: true })
      .click();
    assert.match(
      await d.getByRole("status").innerText(),
      /Choix appliqué pour cette visite/,
    );
    console.log(
      "PASS storage refusal is visible and does not claim durable saving",
    );
    await blocked.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
