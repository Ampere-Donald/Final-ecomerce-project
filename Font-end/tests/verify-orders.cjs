// Fixtures only. All API calls intercepted; no real customer, order or email.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://127.0.0.1:5186";
const out = path.resolve(__dirname, "../../docs/refonte-e/captures");
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  nom: "Client Démonstration",
  email: "qa@example.invalid",
  telephone: "600000000",
};
const item = {
  id: "00000000-0000-4000-8000-000000000002",
  code: "00000000-0000-4000-8000-000000000002",
  model: "Câble HDMI mâle / mâle",
  retailPrice: 3500,
  stock: 5,
  quantity: 2,
  image: base + "/design-e/hdmi-5m.webp",
};
const quote = (price) => ({
  requestProtocol: 1,
  montantArticles: price * 2,
  fraisLivraison: null,
  lignes: [
    {
      produitId: item.id,
      nomProduit: item.model,
      quantite: 2,
      prixUnitaire: price,
      sousTotal: price * 2,
    },
  ],
});
const order = {
  id: "00000000-0000-4000-8000-000000000003",
  numeroSuivi: "DEMO-E-001",
  nomClient: user.nom,
  telephone: user.telephone,
  clientId: user.id,
  adresseLivraison: "Retrait à Akwa, Douala",
  modeReception: "RETRAIT_MAGASIN",
  montantTotal: 7000,
  dateCommande: "2026-09-23T08:00:00Z",
  statut: "EN_ATTENTE",
  lignes: quote(3500).lignes,
};
let orderRows = [structuredClone(order)],
  mode = "ok",
  orderPosts = [],
  mutations = [],
  errors = [],
  checks = [];
const ok = (label) => {
  checks.push(label);
  console.log("PASS " + label);
};
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
      reducedMotion: "reduce",
    });
    await context.route("https://accounts.google.com/**", (r) => r.abort());
    await context.route("**/api/**", async (r) => {
      const req = r.request(),
        p = new URL(req.url()).pathname;
      const send = (body, status = 200) =>
        r.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      if (req.method() !== "GET") mutations.push(p);
      if (p === "/api/auth/me") return send(user);
      if (p === "/api/commandes/quote") {
        assert.deepEqual(req.postDataJSON().lignes, [
          { produitId: item.id, quantite: 2 },
        ]);
        if (mode === "stock")
          return send(
            {
              code: "STOCK_CHANGED",
              message: "Stock insuffisant pour cette référence.",
            },
            409,
          );
        if (mode === "badquote")
          return send({ montantArticles: 1, lignes: [] });
        if (mode === "legacyquote") {
          const legacy = quote(3500);
          delete legacy.requestProtocol;
          return send(legacy);
        }
        return send(quote(mode === "newprice" ? 4000 : 3500));
      }
      if (
        (p === "/api/commandes" || p === "/api/commandes/checkout") &&
        req.method() === "POST"
      ) {
        orderPosts.push({
          path: p,
          body: req.postDataJSON(),
          auth: req.headers().authorization,
        });
        if (mode === "changed")
          return send(
            {
              code: "PRICE_CHANGED",
              message:
                "Les tarifs ont changé. Vérifiez le nouveau récapitulatif.",
              quote: quote(4000),
            },
            409,
          );
        if (mode === "expired")
          return send({ message: "Votre session a expiré." }, 401);
        if (mode === "uncertain") return r.abort("failed");
        await new Promise((resolve) => setTimeout(resolve, 120));
        return send(
          p.endsWith("checkout")
            ? { commande: order, access_token: "QA-ONLY", user }
            : order,
        );
      }
      if (p === "/api/commandes/my-orders") {
        if (mode === "historyerror")
          return send({ message: "QA unavailable" }, 503);
        return send(orderRows);
      }
      if (req.method() === "PATCH" && p.startsWith("/api/commandes/")) {
        assert.equal(req.headers().authorization, "Bearer QA-ONLY");
        if (mode === "actionerror")
          return send(
            { message: "Le statut a changé. Actualisez le suivi." },
            409,
          );
        orderRows[0] = {
          ...orderRows[0],
          statut: p.endsWith("/cancel") ? "ANNULEE" : "LIVREE",
          dateAnnulation: "2026-09-23T11:00:00Z",
          dateLivraison: "2026-09-23T11:00:00Z",
        };
        return send(orderRows[0]);
      }
      if (["/api/auth/login", "/api/auth/signup"].includes(p))
        return send({ access_token: "QA-ONLY", user });
      if (p.startsWith("/api/auth/")) return send({ message: "OK" });
      if (p === "/api/categories") return send([]);
      if (p === "/api/produits")
        return send({ data: [], meta: { total: 0, lastPage: 1 } });
      return send({ message: "Unexpected fixture route" }, 404);
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const goto = async (url) => {
      await page.goto(base + url);
      await page.locator("h1").first().waitFor();
    };
    await goto("/");
    async function seed(auth = false) {
      await page.evaluate(
        ({ item, user, auth }) => {
          localStorage.setItem("appLang", "fr");
          sessionStorage.removeItem("newoteg_order_attempt_v1");
          localStorage.setItem("newoteg_cart", JSON.stringify([item]));
          if (auth) {
            localStorage.setItem("newoteg_token", "QA-ONLY");
            localStorage.setItem("newoteg_user", JSON.stringify(user));
          } else {
            localStorage.removeItem("newoteg_token");
            localStorage.removeItem("newoteg_user");
          }
        },
        { item, user, auth },
      );
    }
    async function fill(auth = false, delivery = false) {
      await page.getByLabel("Nom complet", { exact: true }).fill(user.nom);
      await page.getByLabel("Téléphone", { exact: true }).fill(user.telephone);
      if (delivery) {
        await page.getByRole("radio", { name: /Livraison/ }).check();
        await page.getByLabel("Ville", { exact: true }).fill("Douala");
        await page
          .getByLabel("Quartier, adresse et repère")
          .fill("Adresse fictive QA");
      }
      if (!auth) {
        await page
          .getByRole("checkbox", { name: /créer un compte/i })
          .check();
        await page
          .getByLabel("Adresse e-mail", { exact: true })
          .fill(user.email);
        await page.getByLabel("Créer un mot de passe").fill("QAonly123");
      }
    }
    async function review() {
      await page
        .getByRole("button", { name: "Vérifier ma sélection", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Une dernière vérification" })
        .waitFor();
    }
    const accept = () => page.getByRole("checkbox").check();
    const submit = () =>
      page
        .getByRole("button", { name: "Enregistrer ma commande", exact: true })
        .click();
    const snap = async (slug, width) => {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        slug + " overflow " + width,
      );
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      await page.screenshot({
        path: path.join(out, `${slug}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    };
    await seed();
    await goto("/checkout");
    await fill(false, true);
    for (const width of [360, 390, 768, 1000, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if ([390, 1440].includes(width)) await snap("reception", width);
    }
    await review();
    assert(
      await page
        .getByRole("button", { name: "Enregistrer ma commande", exact: true })
        .isDisabled(),
    );
    for (const width of [360, 390, 768, 1000, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if ([390, 1440].includes(width)) await snap("verification", width);
    }
    await accept();
    await page
      .getByRole("button", { name: "Enregistrer ma commande", exact: true })
      .evaluate((button) => {
        button.click();
        button.click();
      });
    await page.getByRole("heading", { name: "Commande enregistrée" }).waitFor();
    assert.equal(orderPosts.length, 1);
    assert.equal(orderPosts[0].body.montantTotal, 7000);
    assert.equal(orderPosts[0].body.modeReception, "LIVRAISON");
    assert.equal(
      orderPosts[0].body.adresseLivraison,
      "Douala — Adresse fictive QA",
    );
    assert.equal(await page.locator(".e-success-icon").count(), 1);
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("newoteg_cart")).length,
      ),
      0,
    );
    await snap("confirmation", 390);
    await snap("confirmation", 1440);
    ok(
      "Delivery, explicit review, one registration for double click, original confirmation and cart cleared",
    );
    await page
      .getByRole("link", { name: "Voir le suivi", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "DEMO-E-001", exact: true })
      .waitFor();
    ok("Confirmation opens authenticated order tracking");
    for (const scenario of ["stock", "badquote", "legacyquote"]) {
      mode = scenario;
      await seed(true);
      await goto("/checkout");
      await fill(true);
      await page
        .getByRole("button", { name: "Vérifier ma sélection", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Enregistrer ma commande", exact: true })
          .count(),
        0,
      );
    }
    ok(
      "Stock failure, malformed quote and unsupported request protocol block registration",
    );
    mode = "newprice";
    await seed(true);
    await goto("/checkout");
    await fill(true);
    await review();
    await page.getByText(/Un tarif a été actualisé/).waitFor();
    ok("Fresh catalogue prices shown before acceptance");
    mode = "ok";
    await seed(true);
    await goto("/checkout");
    await fill(true);
    await review();
    mode = "changed";
    await accept();
    await submit();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("checkbox").isChecked(), false);
    assert(
      await page
        .getByRole("button", { name: "Enregistrer ma commande", exact: true })
        .isDisabled(),
    );
    mode = "ok";
    await accept();
    await submit();
    await page.getByRole("heading", { name: "Commande enregistrée" }).waitFor();
    assert.equal(orderPosts.at(-1).body.montantTotal, 8000);
    assert.equal(orderPosts.at(-1).auth, "Bearer QA-ONLY");
    ok(
      "Server price conflict requires renewed acceptance; authenticated payload uses JWT and revised total",
    );
    for (const scenario of ["expired", "uncertain"]) {
      mode = "ok";
      await seed(true);
      await goto("/checkout");
      await fill(true);
      await review();
      await accept();
      mode = scenario;
      await submit();
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem("newoteg_cart")).length,
        ),
        1,
      );
      await page
        .getByRole("heading", { name: "Reprendre votre commande" })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Enregistrer ma commande", exact: true })
          .count(),
        0,
      );
    }
    ok(
      "Expired session and uncertain network result preserve cart; uncertain order cannot be blindly resubmitted",
    );
    mode = "ok";
    await seed(true);
    orderRows = [structuredClone(order)];
    for (const width of [360, 390, 768, 1000, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [slug, url] of [
        ["compte", "/profile"],
        ["commandes", "/commandes"],
        ["suivi", "/commandes/" + order.id],
      ]) {
        await goto(url);
        await page.getByText("DEMO-E-001", { exact: true }).first().waitFor();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          slug + " overflow " + width,
        );
        if ([390, 1440].includes(width)) await snap(slug, width);
      }
    }
    ok("Account, order list, tracking responsive at five widths");
    mode = "historyerror";
    await goto("/commandes");
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByText("Aucune commande à afficher").count(), 0);
    mode = "ok";
    await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await page.getByText("DEMO-E-001", { exact: true }).waitFor();
    ok("History error remains distinct from empty; retry works");
    await goto("/commandes/" + order.id);
    await page
      .getByRole("button", { name: "Annuler la commande", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Revenir au suivi" }).click();
    assert.equal(orderRows[0].statut, "EN_ATTENTE");
    await page
      .getByRole("button", { name: "Annuler la commande", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmer", exact: true })
      .click();
    await page.getByText("Annulée", { exact: true }).waitFor();
    ok(
      "Cancellation requires explicit confirmation and uses returned server status",
    );
    orderRows = [
      {
        ...order,
        modeReception: "LIVRAISON",
        statut: "EN_LIVRAISON",
        dateConfirmation: "2026-09-23T09:00:00Z",
      },
    ];
    await goto("/commandes/" + order.id);
    mode = "actionerror";
    await page
      .getByRole("button", { name: "Confirmer la réception", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmer", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(orderRows[0].statut, "EN_LIVRAISON");
    mode = "ok";
    await page
      .getByRole("button", { name: "Confirmer la réception", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmer", exact: true })
      .click();
    await page
      .locator(".e-order-status")
      .filter({ hasText: "Réception terminée" })
      .waitFor();
    ok(
      "Receipt failure does not fabricate completion; confirmed receipt refreshes status",
    );
    await goto("/commandes/unknown");
    await page
      .getByRole("heading", { name: "Commande introuvable dans votre compte" })
      .waitFor();
    ok("Unknown order stays within customer history");
    await seed(false);
    for (const width of [360, 390, 768, 1000, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [slug, url] of [
        ["connexion", "/login"],
        ["inscription", "/signup"],
        ["recuperation", "/forgot-password"],
      ]) {
        await goto(url);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          slug + " overflow " + width,
        );
        if ([390, 1440].includes(width)) await snap(slug, width);
      }
    }
    ok("Login, signup and recovery responsive at five widths");
    await goto("/login?returnTo=%2Fcommandes");
    await page.getByLabel("E-mail ou téléphone").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("QAonly123");
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await page.waitForURL("**/commandes");
    ok("Login retains requested destination");
    await seed(false);
    await goto("/signup");
    await page.getByLabel("Nom complet").fill(user.nom);
    await page.getByLabel("Adresse e-mail").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("QAonly123");
    await page
      .getByRole("button", { name: "Créer mon compte", exact: true })
      .click();
    await page.waitForURL("**/profile");
    ok("Signup uses existing automatic session");
    await seed(false);
    await goto("/forgot-password");
    await page.getByLabel("Adresse e-mail").fill(user.email);
    await page.getByRole("button", { name: "Recevoir un code" }).click();
    await page.getByLabel("Code reçu par e-mail").fill("123456");
    await page
      .getByLabel("Nouveau mot de passe", { exact: true })
      .fill("QAonly456");
    await page
      .getByRole("button", { name: "Modifier le mot de passe" })
      .click();
    await page
      .getByText(
        "Votre mot de passe a été modifié. Vous pouvez vous connecter.",
      )
      .waitFor();
    ok("Recovery submits email, code and new password using mocked endpoints");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "verification-commandes.json"),
      JSON.stringify(
        {
          checks,
          errors,
          fixtureOnly: true,
          interceptedMutations: mutations,
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
