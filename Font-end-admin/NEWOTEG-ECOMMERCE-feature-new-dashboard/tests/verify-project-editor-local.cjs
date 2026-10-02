/* Local real-API recipe. Explicit fixture database only; no .env loading,
 * remote traffic, real customer account, payment, order or stock mutation.
 * Other administration modules are stubbed to isolate the project editor. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, randomBytes } = require("node:crypto");
const connectionString = process.env.NEWOTEG_PROJECT_TEST_DATABASE_URL;
if (!connectionString)
  throw Error("An explicit local fixture database URL is required.");
const target = new URL(connectionString);
if (
  target.protocol !== "postgresql:" ||
  target.hostname !== "127.0.0.1" ||
  target.port !== "55439" ||
  target.pathname !== "/newoteg_quote_acceptance_test"
)
  throw Error(
    "Refusing a database outside the dedicated local acceptance fixture.",
  );
const backend = path.resolve(__dirname, "../../../Back-end");
const { PrismaClient } = require(
  path.join(backend, "node_modules/@prisma/client"),
);
const { PrismaPg } = require(
  path.join(backend, "node_modules/@prisma/adapter-pg"),
);
const { Pool } = require(path.join(backend, "node_modules/pg"));
const bcrypt = require(path.join(backend, "node_modules/bcrypt"));
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const {
  expect,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test");
const pool = new Pool({ connectionString });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const api = "http://127.0.0.1:3000/api";
const base = "http://localhost:5174";
const output =
  "C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/project-editor";
fs.mkdirSync(output, { recursive: true });
const checks = [],
  mutations = [],
  errors = [],
  outside = [];
const check = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
let browser, projectId, actorId;
(async () => {
  const suffix = randomUUID().slice(0, 8);
  const password = randomBytes(24).toString("hex");
  const admin = await db.adminUser.create({
    data: {
      nom: "Recette projets fictive",
      username: "project_ui_" + suffix,
      role: "ADMIN",
      motDePasse: await bcrypt.hash(password, 10),
    },
  });
  actorId = admin.id;
  const category = await db.categorie.create({
    data: { nom: "Recette éditeur " + suffix },
  });
  const product = await db.produit.create({
    data: {
      categorieId: category.id,
      code: "DEMO-UI-" + suffix + "-N",
      nomProduit: "Pièce de recette fictive",
      description:
        "Données fictives pour vérifier l’éditeur, sans montage électronique validé.",
      quantiteStock: 10,
      prixDetail: 3000,
      prixGros: 1000,
      attributs: {
        create: {
          nomAttribut: "Critère de recette",
          typeAttribut: "TEXTE",
          valeurs: { create: { valeur: "DEMO-N" } },
        },
      },
    },
  });
  const before = {
    stock: product.quantiteStock,
    orders: await db.commande.count(),
    movements: await db.mouvementStock.count(),
  };
  const login = await fetch(api + "/admin-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: admin.username, motDePasse: password }),
  });
  assert.equal(login.status, 201, "Fictitious administrator login");
  const auth = await login.json();
  assert.equal(auth.admin.id, admin.id);
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "fr-FR",
    serviceWorkers: "block",
  });
  await context.addInitScript(
    ({ auth }) => {
      localStorage.setItem("newoteg_admin_token", auth.access_token);
      localStorage.setItem("newoteg_admin_user", JSON.stringify(auth.admin));
    },
    { auth },
  );
  let loseCreate = true;
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      outside.push(url.hostname);
      return route.abort();
    }
    if (url.origin === base) return route.continue();
    assert.equal(url.origin, "http://127.0.0.1:3000");
    const real =
      url.pathname.startsWith("/api/projets/") ||
      url.pathname === "/api/projets" ||
      url.pathname === "/api/admin-auth/me" ||
      (url.pathname === "/api/produits" && url.searchParams.has("search"));
    const headers = {
      "access-control-allow-origin": base,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "Authorization,Content-Type,X-Request-Id",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    };
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (real) {
      if (!["GET", "HEAD"].includes(request.method())) {
        assert.ok(
          url.pathname.startsWith("/api/projets/admin"),
          "Only project mutations allowed",
        );
        mutations.push({
          path: url.pathname,
          method: request.method(),
          payload: request.postDataJSON(),
        });
      }
      const response = await route.fetch();
      if (
        request.method() === "POST" &&
        url.pathname === "/api/projets/admin" &&
        loseCreate
      ) {
        assert.equal(response.status(), 201, await response.text());
        projectId = (await response.json()).projet.id;
        loseCreate = false;
        return route.abort("failed"); // Server committed; the browser loses only the reply.
      }
      return route.fulfill({ response });
    }
    assert.equal(
      request.method(),
      "GET",
      "Unrelated modules remain read-only and stubbed",
    );
    if (url.pathname.includes("stream"))
      return route.fulfill({
        status: 200,
        headers: { ...headers, "content-type": "text/event-stream" },
        body: "",
      });
    const value = url.pathname.endsWith("/unread-count")
      ? { count: 0 }
      : url.pathname.endsWith("/solde-global")
        ? { total: 0 }
        : url.pathname.endsWith("/aujourdhui")
          ? null
          : [];
    return route.fulfill({
      status: 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(value),
    });
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(base + "/projets");
  await expect(
    page.getByRole("heading", { name: "Préparer un projet", exact: true }),
  ).toBeVisible();
  check("Protected editor opens with the real local authenticated account");
  for (const [label, value] of [
    ["Titre", "Projet de recette " + suffix],
    ["Lien du projet", "recette-ui-" + suffix],
    ["Résumé", "Liste fictive pour la recette de publication."],
    ["Objectif", "Vérifier la préparation de matériel depuis la boutique."],
    ["Prérequis et accessoires", "Base locale dédiée et données fictives."],
    [
      "Contraintes et limites",
      "Ne pas utiliser cette liste comme un montage réel.",
    ],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByLabel("Rechercher une pièce du catalogue", { exact: true })
    .fill(product.code);
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter " + product.code, exact: true })
    .click();
  await page
    .getByLabel("Rôle, pièce 1", { exact: true })
    .fill("Pièce fictive principale");
  await page.getByLabel("Quantité, pièce 1", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Ajouter un document", exact: true })
    .click();
  await page
    .getByLabel("Titre du document 1", { exact: true })
    .fill("Guide de recette fictif");
  await page
    .getByLabel("URL du document 1", { exact: true })
    .fill("https://example.com/project-demo.pdf");
  for (const width of [360, 390, 768, 1100, 1240, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    const dimensions = await page
      .locator(".project-editor")
      .evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    assert.ok(
      dimensions.scroll <= dimensions.width + 1,
      "No project editor overflow at " + width,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "No document overflow at " + width,
    );
    if ([390, 1440].includes(width)) {
      await page
        .getByRole("heading", { name: "Préparer un projet", exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(output, "editor-" + width + ".png"),
      });
    }
  }
  check(
    "Six viewport widths preserve readable form without horizontal overflow",
  );
  await page
    .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reprendre l’enregistrement",
      exact: true,
    }),
  ).toBeEnabled();
  assert.ok(projectId);
  assert.equal(
    await db.projet.count({ where: { slug: "recette-ui-" + suffix } }),
    1,
  );
  const firstPayload = mutations[0].payload;
  await page.reload();
  await page
    .getByRole("button", { name: "Reprendre l’enregistrement", exact: true })
    .click();
  await expect(
    page.getByText(
      "Tentative retrouvée, sans nouvel enregistrement. La version boutique courante est affichée.",
      { exact: true },
    ),
  ).toBeVisible();
  assert.deepEqual(mutations[1].payload, firstPayload);
  assert.equal(
    await db.projetEvent.count({ where: { projetId: projectId } }),
    1,
  );
  check(
    "Lost real creation reply then reload reuses the same payload/requestId with one project and one receipt",
  );
  await page
    .getByRole("button", { name: "Vérifier avant publication", exact: true })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Vérification avant publication",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Publier le projet vérifié",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByLabel("Référence et caractéristiques vérifiées : " + product.code, {
      exact: true,
    })
    .check();
  await page
    .getByLabel("Matériel, quantités et accessoires vérifiés", { exact: true })
    .check();
  await page
    .getByLabel("Contraintes et documentation vérifiées", { exact: true })
    .check();
  await page
    .getByLabel("Note de validation privée", { exact: true })
    .fill("Validation fictive pour la recette uniquement.");
  await page
    .getByRole("heading", {
      name: "Relire le matériel avant publication",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "review-1440.png") });
  await page
    .getByRole("button", { name: "Publier le projet vérifié", exact: true })
    .click();
  await expect(
    page.getByText("Projet publié selon son calendrier.", { exact: true }),
  ).toBeVisible();
  const published = await db.projet.findUnique({ where: { id: projectId } });
  assert.equal(published.statut, "PUBLIE");
  assert.equal(published.version, 2);
  const publicReply = await fetch(api + "/projets/public/" + published.slug);
  assert.equal(publicReply.status, 200);
  const publicBody = JSON.stringify(await publicReply.json());
  assert.ok(
    !publicBody.includes("Validation fictive") &&
      !publicBody.includes("motDePasse") &&
      !publicBody.includes("cmupActuel"),
  );
  check(
    "Explicit technical review publishes through the real API; public response excludes private notes",
  );
  await page
    .getByLabel("Motif du retrait", { exact: true })
    .fill("Fin de la recette locale fictive");
  await page
    .getByRole("button", { name: "Retirer le projet", exact: true })
    .click();
  await expect(
    page.getByText("Projet retiré. Son historique est conservé.", {
      exact: true,
    }),
  ).toBeVisible();
  assert.equal(
    (await db.projet.findUnique({ where: { id: projectId } })).statut,
    "BROUILLON",
  );
  assert.equal(
    (await fetch(api + "/projets/public/" + published.slug)).status,
    404,
  );
  assert.equal(
    await db.projetEvent.count({ where: { projetId: projectId } }),
    3,
  );
  check(
    "Withdrawal hides the public project and retains the three audited operations",
  );
  assert.equal(
    (await db.produit.findUnique({ where: { id: product.id } })).quantiteStock,
    before.stock,
  );
  assert.equal(await db.commande.count(), before.orders);
  assert.equal(await db.mouvementStock.count(), before.movements);
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, []);
  check(
    "No order or stock movement, no outside request and no browser exception",
  );
  await context.close();
  fs.writeFileSync(
    path.join(output, "result.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks,
        mutations: mutations.map((m) => ({ method: m.method, path: m.path })),
        errors,
        outside,
        database: "dedicated local acceptance fixture",
        projectRemains: "BROUILLON",
      },
      null,
      2,
    ),
  );
  console.log(checks.length + " project editor real-API checks passed.");
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Leave audit evidence intact but remove all accidentally published fixture visibility.
    if (projectId)
      await db.projet
        .update({
          where: { id: projectId },
          data: { statut: "BROUILLON", validationVersion: null },
        })
        .catch(() => {});
    if (actorId)
      await db.adminUser
        .update({
          where: { id: actorId },
          data: { isActive: false, sessionVersion: { increment: 1 } },
        })
        .catch(() => {});
    if (browser) await browser.close();
    await db.$disconnect();
    await pool.end();
  });
