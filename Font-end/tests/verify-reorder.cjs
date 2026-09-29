// Local browser recipe. All API requests are intercepted; no order is submitted.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://127.0.0.1:5186";
const out = path.resolve(__dirname, "../../docs/refonte-e/captures");
const user = {
  id: "fixture-client",
  nom: "Client Démonstration",
  email: "fixture@example.invalid",
};
const order = {
  id: "fixture-order",
  numeroSuivi: "DEMO-REACHAT",
  statut: "LIVREE",
  modeReception: "RETRAIT_MAGASIN",
  dateCommande: "2026-09-28T08:00:00Z",
  montantTotal: 18000,
  lignes: [
    {
      produitId: "active",
      nomProduit: "Câble HDMI",
      quantite: 4,
      prixUnitaire: 3500,
    },
    {
      produitId: "missing",
      nomProduit: "Ancienne référence",
      quantite: 1,
      prixUnitaire: 1000,
    },
    {
      produitId: "out",
      nomProduit: "Référence en rupture",
      quantite: 1,
      prixUnitaire: 1000,
    },
    {
      produitId: "network",
      nomProduit: "Référence à vérifier",
      quantite: 1,
      prixUnitaire: 1000,
    },
    {
      produitId: "unknown",
      nomProduit: "Prix manquant",
      quantite: 1,
      prixUnitaire: 1000,
    },
  ],
};
let price = 4000,
  stock = 3;
const errors = [],
  mutations = [],
  checks = [];
const ok = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
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
    await context.addInitScript(
      ({ user, base }) => {
        localStorage.setItem("newoteg_token", "fixture-only");
        localStorage.setItem("newoteg_user", JSON.stringify(user));
        localStorage.setItem(
          "newoteg_cart",
          JSON.stringify([
            {
              id: "active",
              code: "active",
              model: "Câble HDMI",
              quantity: 1,
              stock: 3,
              retailPrice: 3500,
              image: base + "/design-e/hdmi-5m.webp",
            },
          ]),
        );
      },
      { user, base },
    );
    await context.route("https://accounts.google.com/**", (route) =>
      route.abort(),
    );
    await context.route("**/api/**", async (route) => {
      const req = route.request();
      const pathname = new URL(req.url()).pathname;
      if (req.method() !== "GET") mutations.push(pathname);
      const send = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (pathname === "/api/auth/me") return send(user);
      if (pathname === "/api/commandes/my-orders") return send([order]);
      if (pathname.startsWith("/api/produits/")) {
        const id = pathname.split("/").pop();
        if (id === "missing") return send({ message: "Not found" }, 404);
        if (id === "network") return send({ message: "Unavailable" }, 503);
        return send({
          id,
          estActif: true,
          nomProduit:
            id === "active"
              ? "Câble HDMI"
              : id === "out"
                ? "Référence en rupture"
                : "Prix manquant",
          prixDetail: id === "unknown" ? null : price,
          quantiteStock: id === "out" ? 0 : stock,
          imageUrl: base + "/design-e/hdmi-5m.webp",
        });
      }
      return send([]);
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/commandes/fixture-order");
    await page
      .getByRole("button", { name: "Acheter à nouveau", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Acheter à nouveau" });
    const active = dialog
      .locator(".e-reorder-line")
      .filter({ hasText: "Câble HDMI" });
    await active.getByText("Prix actualisé", { exact: true }).waitFor();
    assert.equal(await active.getByRole("spinbutton").inputValue(), "2");
    assert.equal(
      await dialog.getByRole("checkbox", { checked: false }).count(),
      4,
    );
    assert.equal(
      await dialog.getByText("Référence retirée du catalogue").count(),
      1,
    );
    await dialog.getByText("Vérification impossible — réessayez").waitFor();
    assert.deepEqual(mutations, []);
    ok(
      "Reorder shows current price, adjusted quantity and unavailable/unverified rows without submitting an order",
    );
    await page.screenshot({ path: path.join(out, "reachat-390.png") });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(out, "reachat-1440.png") });
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Acheter à nouveau", exact: true })
        .evaluate((element) => element === document.activeElement),
      true,
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("newoteg_cart"))[0].quantity,
      ),
      1,
    );
    ok("Escape closes review and leaves the cart unchanged");
    await page
      .getByRole("button", { name: "Acheter à nouveau", exact: true })
      .click();
    await active.getByRole("spinbutton").waitFor();
    price = 4500;
    await dialog
      .getByRole("button", { name: "Ajouter la sélection au panier" })
      .click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("newoteg_cart"))[0].quantity,
      ),
      1,
    );
    assert((await active.textContent()).includes("4 500"));
    ok("A price change between review and addition requires fresh acceptance");
    stock = 2;
    await dialog
      .getByRole("button", { name: "Ajouter la sélection au panier" })
      .click();
    await page.waitForFunction(
      () => document.querySelector(".e-reorder-quantity input")?.value === "1",
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("newoteg_cart"))[0].quantity,
      ),
      1,
    );
    ok("Concurrent stock loss updates the proposed quantity without adding it");
    await dialog
      .getByRole("button", { name: "Ajouter la sélection au panier" })
      .click();
    await page.waitForURL("**/panier");
    assert.equal(await page.locator("output").textContent(), "2");
    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("newoteg_cart")),
    );
    assert.equal(cart.length, 1);
    assert.equal(cart[0].retailPrice, 4500);
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    ok(
      "Only the accepted available selection is merged at current prices; no order or API mutation",
    );
    fs.writeFileSync(
      path.join(out, "verification-reachat.json"),
      JSON.stringify(
        {
          fixtureOnly: true,
          checks,
          mutations,
          errors,
          date: new Date().toISOString(),
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
