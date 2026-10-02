// Fictitious client recipe: intercept all APIs, block all external traffic.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const {
  expect,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = "http://127.0.0.1:5187";
const output =
  "C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/projects";
const part = (id, name, price, image = "hdmi-5m") => ({
  id,
  code: "DEMO-" + id + "-N",
  nomProduit: name,
  designationEn: "Test part " + id,
  estActif: true,
  prixDetail: price,
  quantiteStock: 10,
  imageUrl: base + "/design-e/" + image + ".webp",
  categorieId: "connectors",
  categorie: { id: "connectors", nom: "Connectique de recette" },
  attributs: [
    { nomAttribut: "Critère fictif", valeurs: [{ valeur: "DEMO-N" }] },
  ],
});
const parts = [
  part("a", "Câble de recette HDMI", 3500),
  part("b", "Adaptateur de recette", 800),
  part("c", "Multimètre de recette", 8500, "multimetre"),
];
const make = () => ({
  id: "fixture-project",
  slug: "recette-client",
  titre: "Préparer une liaison de recette",
  titreEn: "Prepare a test connection",
  resume: "Données fictives pour vérifier le parcours client.",
  resumeEn: "Fictitious data for client journey verification.",
  objectif:
    "Tester une sélection de matériel, aucune utilisation réelle validée.",
  prerequis:
    "Recette fictive : vérifier les connecteurs avant tout montage réel.",
  contraintes: "Ce projet ne constitue pas une validation électronique.",
  niveau: "DEBUTANT",
  imageUrl: "/design-e/hdmi-5m.webp",
  version: 2,
  validationActuelle: true,
  materielRequisDisponible: true,
  documents: [
    { titre: "Document fictif", url: "https://example.com/test.pdf" },
  ],
  lignes: parts.map((produit, i) => ({
    id: "line-" + produit.id,
    ordre: i,
    quantite: i === 0 ? 2 : 1,
    necessaire: i < 2,
    role: ["Liaison fictive", "Connexion fictive", "Vérification facultative"][
      i
    ],
    nomAttendu: produit.nomProduit,
    referenceAttendue: produit.code,
    produit: structuredClone(produit),
    validationActuelle: true,
    disponible: true,
    prixConnu: true,
    montant: produit.prixDetail * (i === 0 ? 2 : 1),
  })),
});
const checks = [],
  errors = [],
  mutations = [],
  outside = [];
const check = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    async function scenario(options = {}) {
      const state = {
        project: make(),
        status: 200,
        detailReads: 0,
        empty: false,
        hold: false,
        release: null,
        ...options,
      };
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        locale: "fr-FR",
      });
      await ctx.addInitScript(({ cart, lang, reception }) => {
        localStorage.setItem("appLang", lang || "fr");
        if (cart) localStorage.setItem("newoteg_cart", JSON.stringify(cart));
        if (reception)
          localStorage.setItem(
            "newoteg_reception_v1",
            JSON.stringify({ schema: 1, ...reception }),
          );
      }, options);
      await ctx.route("**/*", (route) => {
        const origin = new URL(route.request().url()).origin;
        if (origin === base) return route.continue();
        outside.push(origin);
        return route.abort();
      });
      await ctx.route("**/api/**", async (route) => {
        const request = route.request(),
          u = new URL(request.url());
        if (request.method() !== "GET") {
          mutations.push(u.pathname);
          return route.abort();
        }
        if (u.pathname.includes("/projets/public/")) {
          state.detailReads++;
          if (state.hold)
            await new Promise((resolve) => {
              state.release = resolve;
            });
          return route
            .fulfill({
              status: state.status,
              json:
                state.status === 200 ? state.project : { message: "recipe" },
            })
            .catch(() => {});
        }
        if (u.pathname.endsWith("/projets"))
          return route.fulfill({
            json: {
              data: state.empty ? [] : [state.project],
              meta: { total: state.empty ? 0 : 1, lastPage: 1 },
            },
          });
        if (u.pathname.includes("/produits/")) {
          if (state.holdCart)
            await new Promise((resolve) => {
              state.releaseCart = resolve;
            });
          return route.fulfill({
            json:
              parts.find((p) => p.id === u.pathname.split("/").pop()) ||
              parts[0],
          });
        }
        if (u.pathname.endsWith("/produits"))
          return route.fulfill({
            json: { data: parts, meta: { total: 3, lastPage: 1 } },
          });
        return route.fulfill({
          json: u.pathname.endsWith("/categories")
            ? [{ id: "connectors", nom: "Connectique" }]
            : [],
        });
      });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      const open = async () => {
        await page.goto(base + "/projets/recette-client");
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          options.lang === "en" ? "Prepare" : "Préparer",
        );
      };
      const add = () =>
        page.getByRole("button", {
          name: /Vérifier et ajouter au panier|Check and add to cart/,
        });
      const chosen = (id) =>
        page
          .locator(".e-project-materials li")
          .filter({ hasText: "DEMO-" + id + "-N" })
          .getByRole("checkbox");
      const quantity = (id) =>
        page.getByRole("spinbutton", { name: "Quantité : DEMO-" + id + "-N" });
      const cart = () =>
        page.evaluate(() =>
          JSON.parse(localStorage.getItem("newoteg_cart") || "[]"),
        );
      return { ctx, page, state, open, add, chosen, quantity, cart };
    }
    let s = await scenario();
    await s.page.goto(base + "/");
    await s.page
      .getByRole("link", { name: "Voir les projets", exact: true })
      .click();
    await expect(
      s.page.getByRole("heading", { name: "Préparer votre prochain projet" }),
    ).toBeVisible();
    await s.page
      .getByRole("link", { name: "Préparer le matériel", exact: true })
      .click();
    await expect(s.chosen("a")).toBeChecked();
    await expect(s.chosen("b")).toBeChecked();
    await expect(s.chosen("c")).not.toBeChecked();
    await expect(s.quantity("a")).toHaveValue("2");
    await expect(s.page.locator(".e-project-total")).toContainText("7 800");
    for (const width of [360, 390, 768, 1100, 1240, 1440]) {
      await s.page.setViewportSize({ width, height: 1100 });
      assert(
        await s.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "overflow " + width,
      );
      if ([390, 1440].includes(width))
        await s.page.screenshot({
          path: path.join(output, "detail-" + width + ".png"),
          fullPage: true,
          animations: "disabled",
        });
    }
    await s.add().click();
    await expect(s.page).toHaveURL(base + "/panier");
    assert.deepEqual(
      (await s.cart()).map((p) => [p.id, p.quantity, p.reference]),
      [
        ["a", 2, "DEMO-a-N"],
        ["b", 1, "DEMO-b-N"],
      ],
    );
    assert.equal(s.state.detailReads, 2);
    check(
      "Home/library/detail, suffixes, required choices, six widths and freshly checked atomic cart",
    );
    await s.ctx.close();

    s = await scenario();
    await s.open();
    await s.chosen("b").uncheck();
    await expect(s.add()).toBeDisabled();
    await expect(s.page.locator(".e-project-partial")).toContainText(
      "ne constitue pas un kit complet",
    );
    await s.page
      .getByRole("checkbox", {
        name: "Je souhaite acheter seulement cette sélection",
      })
      .check();
    await s.add().click();
    await expect(s.page).toHaveURL(base + "/panier");
    assert.equal((await s.cart()).length, 1);
    check("Required omissions need explicit partial-selection acceptance");
    await s.ctx.close();

    s = await scenario();
    await s.open();
    s.state.project.lignes[0].produit.prixDetail = 4000;
    await s.add().click();
    await expect(s.page.getByRole("alert")).toContainText("a changé");
    assert.equal((await s.cart()).length, 0);
    await expect(s.page.locator(".e-project-total")).toContainText("8 800");
    await s.add().click();
    await expect(s.page).toHaveURL(base + "/panier");
    assert.equal((await s.cart())[0].retailPrice, 4000);
    check(
      "Changed price updates the estimate and requires another explicit confirmation",
    );
    await s.ctx.close();

    s = await scenario();
    await s.open();
    s.state.project.lignes[0].produit.quantiteStock = 1;
    await s.add().click();
    await expect(s.page.getByRole("alert")).toContainText("a changé");
    await expect(s.quantity("a")).toHaveValue("2");
    await expect(s.add()).toBeDisabled();
    assert.equal((await s.cart()).length, 0);
    await s.quantity("a").fill("1");
    await expect(s.add()).toBeDisabled();
    await s.page
      .getByRole("checkbox", {
        name: "Je souhaite acheter seulement cette sélection",
      })
      .check();
    await s.add().click();
    await expect(s.page).toHaveURL(base + "/panier");
    check(
      "Stock decrease never trims quantities or adds a partial group silently",
    );
    await s.ctx.close();

    s = await scenario({ cart: [{ id: "a", quantity: 9 }] });
    await s.open();
    await expect(s.page.locator(".e-project-materials")).toContainText(
      "9 déjà au panier",
    );
    await expect(s.add()).toBeDisabled();
    await expect(s.quantity("a")).toHaveValue("2");
    check("Existing cart quantities are included in available-stock limits");
    await s.ctx.close();

    s = await scenario({ cart: [{ id: "a", quantity: 1 }], holdCart: true });
    await s.open();
    await expect(s.add()).toBeDisabled();
    await expect(s.page.getByRole("status")).toContainText("panier doit finir");
    await expect.poll(() => Boolean(s.state.releaseCart)).toBe(true);
    s.state.releaseCart();
    await expect(s.add()).toBeEnabled();
    check("Adding waits for existing cart hydration and verification");
    await s.ctx.close();

    s = await scenario();
    await s.open();
    s.state.project.version++;
    s.state.project.lignes.splice(0, 1);
    await s.add().click();
    await expect(s.page.locator(".e-project-materials")).toContainText(
      "Ligne retirée",
    );
    await expect(s.chosen("a")).toBeChecked();
    await expect(s.add()).toBeDisabled();
    await s.chosen("a").uncheck();
    await s.page
      .getByRole("checkbox", {
        name: "Je souhaite acheter seulement cette sélection",
      })
      .check();
    await s.add().click();
    await expect(s.page).toHaveURL(base + "/panier");
    assert.deepEqual(
      (await s.cart()).map((p) => p.id),
      ["b"],
    );
    check(
      "A removed chosen line remains visible until the client explicitly unchecks it",
    );
    await s.ctx.close();

    for (const mode of ["approval", "price", "stock", "missing"]) {
      s = await scenario();
      if (mode === "approval") s.state.project.validationActuelle = false;
      if (mode === "price") {
        s.state.project.lignes[0].prixConnu = false;
        s.state.project.lignes[0].produit.prixDetail = null;
      }
      if (mode === "stock")
        s.state.project.lignes[0].produit.quantiteStock = null;
      if (mode === "missing") s.state.project.lignes[0].produit = null;
      await s.open();
      await expect(s.add()).toBeDisabled();
      assert.equal((await s.cart()).length, 0);
      await s.ctx.close();
    }
    check(
      "Missing, stale technical approval and unknown stock/price prevent purchase",
    );

    s = await scenario({ status: 503 });
    await s.page.goto(base + "/projets/recette-client");
    await expect(s.page.getByRole("alert")).toContainText("Impossible de lire");
    s.state.status = 404;
    await s.page.getByRole("button", { name: "Réessayer" }).click();
    await expect(s.page.getByRole("alert")).toContainText("plus disponible");
    s.state.status = 200;
    await s.page.getByRole("button", { name: "Réessayer" }).click();
    await expect(s.add()).toBeEnabled();
    s.state.status = 404;
    await s.add().click();
    await expect(s.page.getByRole("alert")).toContainText("plus publié");
    await expect(s.add()).toBeDisabled();
    s.state.status = 200;
    await s.page
      .getByRole("button", { name: "Actualiser", exact: true })
      .click();
    await expect(s.add()).toBeEnabled();
    check(
      "Network failure, withdrawal and re-publication are distinct and recoverable",
    );
    await s.ctx.close();

    s = await scenario();
    s.state.project.lignes[2].produit.quantiteStock = 0;
    await s.open();
    await expect(s.add()).toBeEnabled();
    await s.chosen("c").check();
    await expect(s.add()).toBeDisabled();
    await s.chosen("c").uncheck();
    await expect(s.add()).toBeEnabled();
    check("Optional shortage blocks only when that accessory is selected");
    await s.ctx.close();

    s = await scenario();
    await s.open();
    const newLine = structuredClone(s.state.project.lignes[0]);
    newLine.id = "line-d";
    newLine.produit.id = "d";
    newLine.produit.code = "DEMO-d-N";
    newLine.referenceAttendue = "DEMO-d-N";
    newLine.quantite = 3;
    s.state.project.lignes.push(newLine);
    s.state.project.version++;
    await s.add().click();
    await expect(s.page.getByRole("alert")).toContainText("a changé");
    await expect(s.chosen("d")).not.toBeChecked();
    await expect(s.quantity("d")).toHaveValue("3");
    await s.chosen("d").check();
    await expect(s.quantity("d")).toHaveValue("3");
    await s.add().click();
    await expect(s.page).toHaveURL(base + "/panier");
    assert.equal((await s.cart()).find((p) => p.id === "d").quantity, 3);
    check(
      "Newly published lines are never auto-selected and preserve their recommended quantity",
    );
    await s.ctx.close();

    s = await scenario();
    s.state.project.lignes[0].produit.imageUrl = {};
    await s.page.goto(base + "/projets/recette-client");
    await expect(s.page.getByRole("alert")).toContainText("Impossible de lire");
    check(
      "Malformed public product data displays a recoverable error instead of crashing",
    );
    await s.ctx.close();

    s = await scenario({ empty: true });
    await s.page.goto(base + "/projets");
    await expect(
      s.page.getByRole("heading", {
        name: "Les projets se préparent en boutique",
      }),
    ).toBeVisible();
    check("Empty public library offers advice without fabricated projects");
    await s.ctx.close();

    s = await scenario({
      lang: "en",
      reception: { mode: "LIVRAISON", ville: "Douala" },
    });
    await s.open();
    await expect(s.add()).toBeEnabled();
    await expect(s.page.locator(".e-project-materials")).toContainText(
      "Required for the project",
    );
    await expect(s.page.locator(".e-project-selection")).toContainText(
      "Confirm coverage, fees and timing",
    );
    await s.ctx.close();
    check("English labels and prudent reception rules");

    s = await scenario();
    await s.open();
    s.state.hold = true;
    await s.add().evaluate((button) => {
      button.click();
      button.click();
    });
    await expect.poll(() => Boolean(s.state.release)).toBe(true);
    assert.equal(s.state.detailReads, 2);
    await s.page
      .locator(".e-crumbs")
      .getByRole("link", { name: "Projets", exact: true })
      .click();
    s.state.release();
    await expect(
      s.page.getByRole("heading", { name: "Préparer votre prochain projet" }),
    ).toBeVisible();
    assert.equal((await s.cart()).length, 0);
    check(
      "Double click sends one recheck; leaving the page cancels late cart addition",
    );
    await s.ctx.close();

    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    assert(
      outside.every((origin) => origin === "https://accounts.google.com"),
      "unexpected external request",
    );
    check(
      "No browser errors, API mutation, documentation fetch or external transmission",
    );
    fs.writeFileSync(
      path.join(output, "result.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          checks,
          errors,
          mutations,
          blockedOutside: [...new Set(outside)],
          mockAPI: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
