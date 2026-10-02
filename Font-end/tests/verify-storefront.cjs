// QA only: every API request is intercepted. No production data or real order is used.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base = process.env.NEWOTEG_STOREFRONT_TEST_URL || "http://127.0.0.1:5186";
if (!["http://127.0.0.1:5186", "http://127.0.0.1:5187"].includes(base))
  throw Error("This recipe only accepts the local storefront test ports.");
const out =
  process.env.NEWOTEG_STOREFRONT_TEST_OUTPUT ||
  path.resolve(__dirname, "../../docs/refonte-e/captures");
fs.mkdirSync(out, { recursive: true });
const products = [
  {
    id: "qa-hdmi",
    estActif: true,
    nomProduit: "Câble HDMI mâle / mâle",
    prixDetail: "3500",
    quantiteStock: 3,
    imageUrl: base + "/design-e/hdmi-5m.webp",
    categorieId: "connectique",
    categorie: { nom: "Connectique" },
    attributs: [{ nomAttribut: "Longueur", valeurs: [{ valeur: "5 m" }] }],
  },
  {
    id: "qa-meter",
    estActif: true,
    nomProduit: "Multimètre numérique",
    prixDetail: "8500",
    quantiteStock: 12,
    imageUrl: base + "/design-e/multimetre.webp",
    categorieId: "outillage",
    categorie: { nom: "Outillage" },
  },
  {
    id: "qa-out",
    estActif: true,
    nomProduit: "Article de test indisponible",
    prixDetail: "2000",
    quantiteStock: 0,
  },
  {
    id: "qa-unknown",
    estActif: true,
    nomProduit: "Article de test à confirmer",
    prixDetail: null,
    quantiteStock: null,
  },
  {
    id: "qa-broken",
    estActif: true,
    nomProduit: "Article de test sans visuel",
    prixDetail: "1500",
    quantiteStock: 8,
    imageUrl: base + "/not-an-image.png",
  },
];
let mode = "ok";
const checkoutPayloads = [];
const requests = [],
  mutations = [],
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
      viewport: { width: 1440, height: 1000 },
      locale: "fr-FR",
    });
    await context.route("https://accounts.google.com/**", (r) => r.abort());
    await context.route("**/not-an-image.png", (r) =>
      r.fulfill({ status: 404, body: "" }),
    );
    await context.route("**/api/**", async (r) => {
      const u = new URL(r.request().url());
      requests.push(u.pathname + u.search);
      const send = (data, status = 200) =>
        r.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (r.request().method() !== "GET") {
        mutations.push(u.pathname);
        if (u.pathname === "/api/commandes/checkout")
          checkoutPayloads.push(r.request().postDataJSON());
        if (u.pathname === "/api/commandes/quote") {
          const requestLines = r.request().postDataJSON().lignes;
          const lignes = requestLines.map(({ produitId, quantite }) => ({
            produitId,
            nomProduit: "Câble HDMI mâle / mâle",
            quantite,
            prixUnitaire: 3500,
            sousTotal: 3500 * quantite,
          }));
          return send({
            requestProtocol: 1,
            montantArticles: lignes.reduce(
              (sum, line) => sum + line.sousTotal,
              0,
            ),
            fraisLivraison: null,
            lignes,
          });
        }
        return send({
          commande: { id: "qa-order", numeroSuivi: "QA-DEMO-001" },
          numeroSuivi: "QA-DEMO-001",
        });
      }
      if (u.pathname === "/api/auth/me")
        return send({
          id: "qa-user",
          nom: "Client Démonstration",
          email: "qa@example.invalid",
        });
      if (u.pathname.endsWith("/categories"))
        return send([
          { id: "connectique", nom: "Connectique" },
          { id: "outillage", nom: "Outillage" },
        ]);
      if (u.pathname === "/api/produits") {
        if (mode === "error")
          return send({ message: "QA network failure" }, 503);
        if (mode === "malformed") return send({ unexpected: "data" });
        let rows = mode === "empty" ? [] : [...products];
        const search = u.searchParams.get("search")?.toLowerCase();
        if (search)
          rows = rows.filter((p) =>
            p.nomProduit.toLowerCase().includes(search),
          );
        if (u.searchParams.get("inStock") === "true")
          rows = rows.filter((p) => p.quantiteStock > 0);
        const cat = u.searchParams.get("categoryId");
        if (cat) rows = rows.filter((p) => p.categorieId === cat);
        if (u.searchParams.get("sort") === "price_asc")
          rows.sort((a, b) => a.prixDetail - b.prixDetail);
        return send({ data: rows, meta: { total: rows.length, lastPage: 1 } });
      }
      if (u.pathname.startsWith("/api/produits/")) {
        const p = products.find((p) => p.id === u.pathname.split("/").pop());
        return send(p || { message: "Not found" }, p ? 200 : 404);
      }
      return send([]);
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const goto = async (url) => {
      await page.goto(base + url);
      await page.locator("h1").first().waitFor();
      await page.waitForFunction(() => !document.querySelector(".e-skeleton"));
    };
    await goto("/");
    assert.equal(await page.locator(".e-card").count(), 3);
    ok("Home reads API selection");
    await page.getByRole("searchbox").fill("HDMI");
    await page.getByRole("searchbox").press("Enter");
    await page.waitForURL("**/catalogue?search=HDMI");
    await page
      .getByRole("heading", { name: "Résultats pour « HDMI »" })
      .waitFor();
    await page.waitForFunction(() => !document.querySelector(".e-skeleton"));
    assert.equal(await page.locator(".e-card").count(), 1);
    ok("Search and URL synchronise");
    await page.getByRole("button", { name: "Filtres", exact: true }).click();
    await page.getByRole("checkbox").click();
    await page.waitForURL("**instock=true*");
    await page.waitForFunction(
      () => document.querySelector(".e-check input")?.checked,
    );
    await page
      .getByRole("dialog")
      .getByRole("combobox")
      .selectOption("connectique");
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.waitForFunction(
      () => document.querySelectorAll(".e-card").length === 1,
    );
    assert(page.url().includes("category=connectique"));
    ok("Filters and Escape");
    const sortedResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname.endsWith("/api/produits") &&
        url.searchParams.get("sort") === "price_asc"
      );
    });
    await page
      .getByRole("combobox", { name: "Trier les produits" })
      .selectOption("price-asc");
    await sortedResponse;
    await page.waitForFunction(() => !document.querySelector(".e-skeleton"));
    assert(requests.some((u) => u.includes("sort=price_asc")));
    await page.goBack();
    assert(!page.url().includes("price-asc"));
    ok("Sort and browser back");
    await goto("/product/qa-hdmi");
    await page.locator(".e-purchase button.e-btn").click();
    await page.locator(".e-purchase button.e-btn").click();
    await page.locator(".e-purchase button.e-btn").click();
    await page.locator(".e-purchase button.e-btn").click();
    await goto("/panier");
    assert.equal(await page.locator("output").textContent(), "3");
    assert.equal(
      await page
        .getByRole("button", { name: "Augmenter la quantité" })
        .isDisabled(),
      true,
    );
    await page.reload();
    await page.locator("output").waitFor();
    assert.equal(await page.locator("output").textContent(), "3");
    ok("Cart bounds and persistence");
    await page.getByRole("button", { name: "Diminuer la quantité" }).click();
    assert.equal(await page.locator("output").textContent(), "2");
    await page.getByRole("link", { name: "Choisir la réception" }).click();
    const accountChoice = page.getByRole("checkbox", {
      name: /créer un compte pour mes prochaines commandes/i,
    });
    assert.equal(await page.locator("input[type=password]").count(), 0);
    await accountChoice.check();
    assert.equal(await page.locator("input[type=password]").count(), 1);
    await accountChoice.uncheck();
    assert.equal(await page.locator("input[type=password]").count(), 0);
    ok("Account creation is optional; guest checkout is the default");
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
    await page.getByRole("heading", { name: "Commande enregistrée" }).waitFor();
    assert.equal(
      await page.getByRole("link", { name: "Voir le suivi" }).count(),
      0,
    );
    await page.getByRole("link", { name: "Contacter la boutique" }).waitFor();
    assert.equal(await page.locator(".e-success-icon").count(), 1);
    assert(
      (await page.locator(".e-order-id").textContent()).includes("QA-DEMO-001"),
    );
    ok("Mocked checkout returns original confirmation");
    await page.screenshot({
      path: path.join(out, "confirmation-1440.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({
      path: path.join(out, "confirmation-390.png"),
      fullPage: true,
    });
    await goto("/product/qa-hdmi");
    await page.locator(".e-purchase button.e-btn").click();
    await goto("/panier");
    await page.getByRole("link", { name: "Choisir la réception" }).click();
    await page.getByRole("radio", { name: /Livraison/i }).check();
    await page
      .getByLabel("Nom complet", { exact: true })
      .fill("Client Démonstration");
    await page.getByLabel("Téléphone", { exact: true }).fill("600000000");
    await page.getByLabel("Ville", { exact: true }).fill("Douala");
    await page
      .getByLabel("Quartier, adresse et repère", { exact: true })
      .fill("Akwa, près du marché");
    await page
      .getByText(
        "La boutique vous confirmera la zone desservie, les frais et le délai.",
      )
      .waitFor();
    await page
      .getByRole("button", { name: "Vérifier ma sélection", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Une dernière vérification" })
      .waitFor();
    await page.getByText(/frais éventuels restent à confirmer/i).waitFor();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Enregistrer ma commande", exact: true })
      .click();
    await page.getByRole("heading", { name: "Commande enregistrée" }).waitFor();
    assert.equal(checkoutPayloads[1].modeReception, "LIVRAISON");
    assert.equal(
      checkoutPayloads[1].adresseLivraison,
      "Douala — Akwa, près du marché",
    );
    assert.equal(checkoutPayloads[1].fraisLivraison, undefined);
    ok("Delivery address is captured; unconfirmed fees are not fabricated");
    await goto("/checkout");
    await page
      .getByRole("heading", { name: "Votre panier attend vos projets" })
      .waitFor();
    assert.equal(await page.locator("input[type=password]").count(), 0);
    ok("Empty checkout has no purchase form");
    await goto("/product/qa-out");
    assert.equal(await page.locator(".e-purchase button.e-btn").count(), 0);
    await page.getByText("Rupture", { exact: true }).waitFor();
    ok("Out-of-stock cannot be added");
    await goto("/product/qa-unknown");
    assert.equal(await page.locator(".e-purchase button.e-btn").count(), 0);
    ok("Unknown price and stock cannot be added");
    await goto("/product/not-found");
    await page
      .getByRole("heading", { name: "Ce produit est introuvable" })
      .waitFor();
    ok("Product 404");
    mode = "error";
    await page.goto(base + "/catalogue?search=HDMI");
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page.getByText("Aucun résultat pour cette recherche").count(),
      0,
    );
    mode = "ok";
    await page.getByRole("button", { name: "Réessayer" }).click();
    await page.locator(".e-card").first().waitFor();
    ok("Error distinct from empty and retry keeps search");
    mode = "malformed";
    await goto("/catalogue");
    await page.getByRole("alert").waitFor();
    ok("Malformed API response shows error");
    mode = "empty";
    await goto("/catalogue");
    await page
      .getByRole("heading", { name: "Aucun résultat pour cette recherche" })
      .waitFor();
    ok("Empty results");
    mode = "ok";
    for (const width of [360, 390, 768, 1000, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [slug, url] of [
        ["accueil", "/"],
        ["catalogue", "/catalogue"],
        ["fiche", "/product/qa-hdmi"],
        ["panier", "/panier"],
        ["guides", "/guides"],
        ["faq", "/faq"],
        ["livraison", "/livraison"],
      ]) {
        await goto(url);
        const size = await page.evaluate(() => ({
          viewport: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert(
          size.scroll <= size.viewport + 1,
          `${slug} overflows at ${width}: ${size.scroll}`,
        );
        if ([390, 1440].includes(width))
          await page.screenshot({
            path: path.join(out, `${slug}-${width}.png`),
            fullPage: true,
          });
      }
      ok(`Responsive pages ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "English", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("heading", { name: "Your next project starts here." })
      .waitFor();
    ok("Language switch");
    await page.evaluate(() => {
      localStorage.setItem("appLang", "fr");
      localStorage.setItem("newoteg_token", "QA-INTERCEPTED-ONLY");
      localStorage.setItem(
        "newoteg_favorites",
        JSON.stringify([
          {
            id: "qa-hdmi",
            code: "QA",
            model: "Ancien libellé",
            retailPrice: 1,
          },
        ]),
      );
    });
    await goto("/favourites");
    await page.locator(".e-card").waitFor();
    assert(
      (await page.locator(".e-card h3").textContent()).includes("Câble HDMI"),
    );
    assert(
      (await page.locator(".e-card .e-price").textContent()).includes("3"),
    );
    await page.screenshot({
      path: path.join(out, "favoris-390.png"),
      fullPage: true,
    });
    await page.locator(".e-favorite").click();
    await page
      .getByRole("heading", { name: "Aucune référence enregistrée" })
      .waitFor();
    ok("Legacy favourites refresh prices and remove by stable ID");
    await goto("/product/qa-hdmi");
    await page.getByRole("button", { name: "Agrandir le visuel" }).click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    ok("Photo zoom and Escape");
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, [
      "/api/commandes/quote",
      "/api/commandes/checkout",
      "/api/commandes/quote",
      "/api/commandes/checkout",
    ]);
    assert.equal(checkoutPayloads[0].email, undefined);
    assert.equal(checkoutPayloads[0].motDePasse, undefined);
    assert.equal(checkoutPayloads[0].telephone, "600000000");
    ok("No uncaught browser errors; only mocked order");
    fs.writeFileSync(
      path.join(out, "verification.json"),
      JSON.stringify(
        {
          checks,
          errors,
          interceptedMutations: mutations,
          fixtureOnly: true,
          date: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
