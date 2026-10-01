// Local browser recipe; every API is mocked and all external traffic is blocked.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const {
  expect,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = "http://127.0.0.1:5187",
  key = "newoteg_comparison_v1";
const output =
  "C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/comparator";
fs.mkdirSync(output, { recursive: true });
const make = (id, name, categoryId = "connectors", attributes = []) => ({
  id,
  code: "TEST-" + id + "-TR",
  nomProduit: name,
  designationEn: "Test " + id,
  estActif: true,
  categorieId: categoryId,
  categorie: { id: categoryId, nom: "Connectique" },
  prixDetail: 3500,
  quantiteStock: 12,
  marque: "Recette fictive",
  imageUrl: base + "/design-e/hdmi-5m.webp",
  attributs: attributes.map(([nomAttribut, valeur]) => ({
    nomAttribut,
    valeurs: [{ valeur }],
  })),
  cmupActuel: "private-cost",
  dernierFournisseurId: "private-supplier",
});
const products = {
  a: make("a", "Câble de recette A", "connectors", [
    ["Longueur", "5 m"],
    ["Broches", "19"],
    ["Blindage", "Double"],
  ]),
  b: make("b", "Câble de recette B", "connectors", [
    ["Longueur", "2 m"],
    ["Broches", "19"],
  ]),
  c: make("c", "Câble de recette C", "connectors", [
    ["Longueur", "5 m"],
    ["Broches", "19"],
  ]),
  d: make("d", "Câble de recette D"),
  tool: make("tool", "Outil de recette", "tools"),
  unknown: make("unknown", "Article sans famille", ""),
};
let mode = "ok",
  price = 3500,
  held = false,
  release;
const errors = [],
  mutations = [],
  outside = [],
  checks = [];
const check = (text) => {
  checks.push(text);
  console.log("PASS " + text);
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    async function context(options = {}) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        locale: "fr-FR",
      });
      await ctx.addInitScript(
        ({ key, denied, corrupt, lang }) => {
          localStorage.setItem("appLang", lang || "fr");
          if (corrupt) localStorage.setItem(key, "{broken");
          if (denied) {
            const get = Storage.prototype.getItem,
              set = Storage.prototype.setItem;
            Storage.prototype.getItem = function (k) {
              if (k === key) throw new Error("denied");
              return get.call(this, k);
            };
            Storage.prototype.setItem = function (k, v) {
              if (k === key) throw new Error("denied");
              return set.call(this, k, v);
            };
          }
        },
        { key, ...options },
      );
      await ctx.route("**/*", (route) =>
        new URL(route.request().url()).origin === base
          ? route.continue()
          : (outside.push(route.request().url()), route.abort()),
      );
      await ctx.route("**/api/**", async (route) => {
        if (route.request().method() !== "GET")
          mutations.push(route.request().url());
        const u = new URL(route.request().url()),
          id = u.pathname.split("/").pop();
        if (u.pathname.endsWith("/produits"))
          return route.fulfill({
            json: {
              data: Object.values(products),
              meta: { total: 6, lastPage: 1 },
            },
          });
        if (u.pathname.includes("/produits/")) {
          if (held && id === "b")
            await new Promise((resolve) => {
              release = resolve;
            });
          if (id === "b" && mode === "network")
            return route.fulfill({
              status: 503,
              json: { message: "temporary" },
            });
          if (!products[id] || (id === "b" && mode === "removed"))
            return route.fulfill({ status: 404, json: {} });
          let product = {
            ...products[id],
            prixDetail: id === "a" ? price : 3500,
          };
          if (id === "b" && mode === "family") product.categorieId = "changed";
          if (id === "b" && mode === "inactive") product.estActif = false;
          if (id === "b" && mode === "invalid")
            product.attributs = [{ nomAttribut: "x", valeurs: "bad" }];
          return route.fulfill({ json: product });
        }
        return route.fulfill({
          json: u.pathname.endsWith("/categories")
            ? [{ id: "connectors", nom: "Connectique" }]
            : [],
        });
      });
      return ctx;
    }
    const ctx = await context(),
      page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/comparer");
    await expect(
      page.getByRole("heading", {
        name: "Quelles pièces souhaitez-vous comparer ?",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Ouvrir le catalogue", exact: true })
      .click();
    const select = (id) =>
      page.getByRole("button", {
        name: "Comparer : " + products[id].nomProduit,
        exact: true,
      });
    await select("a").click();
    await select("tool").click();
    await expect(
      page.getByText(
        "Choisissez des articles de la même famille, ou videz la sélection.",
        { exact: false },
      ),
    ).toBeVisible();
    await select("unknown").click();
    await expect(
      page.getByText(
        "La famille de cet article doit être renseignée pour le comparer.",
        { exact: false },
      ),
    ).toBeVisible();
    await select("b").click();
    await select("c").click();
    await select("d").click();
    await expect(
      page.getByText(
        "Trois articles maximum. Retirez un article pour en choisir un autre.",
        { exact: false },
      ),
    ).toBeVisible();
    assert.deepEqual(
      await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key),
      { schema: 1, categoryId: "connectors", ids: ["a", "b", "c"] },
    );
    check(
      "same family, missing category and maximum of three; IDs only persisted",
    );
    await page
      .getByRole("link", { name: "Comparateur (3/3)", exact: true })
      .click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("row", { name: "Longueur 5 m 2 m 5 m", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".e-compare-different")).toHaveCount(1);
    await expect(
      page.getByRole("row", {
        name: "Blindage Données incomplètes Double Non renseigné Non renseigné",
        exact: true,
      }),
    ).toBeVisible();
    assert.doesNotMatch(
      await page.locator(".e-comparison-page").innerText(),
      /private-cost|private-supplier/,
    );
    await page
      .getByRole("checkbox", {
        name: "Voir seulement les différences techniques renseignées",
        exact: true,
      })
      .check();
    await expect(page.getByRole("row", { name: /^Broches/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /^Longueur/ })).toBeVisible();
    await page.getByRole("checkbox").uncheck();
    check(
      "exact references, units, differences and missing data; no internal fields",
    );
    price = 4500;
    await page.getByRole("button", { name: "Actualiser", exact: true }).click();
    await expect(page.getByRole("row", { name: /^Prix détail/ })).toContainText(
      "4 500",
    );
    await page.reload();
    await expect(page.getByRole("table")).toBeVisible();
    assert.match(
      await page.getByRole("row", { name: /^Prix détail/ }).innerText(),
      /4\s500/,
    );
    check("selection survives reload; price reloaded from catalogue");
    for (const width of [360, 390, 768, 1100, 1240, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "body overflow at " + width,
      );
      const region = page.getByRole("region", {
        name: "Comparer les composants",
        exact: true,
      });
      await region.focus();
      await region.press("ArrowRight");
      if (width <= 390)
        assert(
          await region.evaluate((el) => el.scrollWidth > el.clientWidth),
          "mobile table must scroll",
        );
      if ([390, 1440].includes(width)) {
        await region.evaluate((el) => {
          el.scrollLeft = 0;
          el.blur();
          window.scrollTo({ top: 0, behavior: "instant" });
        });
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await page.screenshot({
          path: path.join(output, "comparison-" + width + ".png"),
          fullPage: true,
        });
      }
    }
    check(
      "six widths without body overflow; keyboard-accessible table scrolling",
    );
    for (const [state, text] of [
      ["network", "Impossible de relire cette référence. Réessayez."],
      ["removed", "Cette référence n’est plus disponible au catalogue."],
      [
        "family",
        "La famille a changé. Retirez cette référence pour poursuivre.",
      ],
      ["inactive", "Cette référence n’est plus disponible au catalogue."],
      [
        "invalid",
        "Les caractéristiques de cette référence ne peuvent pas être lues.",
      ],
    ]) {
      mode = state;
      await page
        .getByRole("button", { name: "Actualiser", exact: true })
        .click();
      await expect(page.getByText(text, { exact: true })).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);
    }
    mode = "removed";
    await page.getByRole("button", { name: "Actualiser", exact: true }).click();
    const lost = page
      .locator(".e-comparison-selection > div")
      .filter({
        hasText: "Cette référence n’est plus disponible au catalogue.",
      });
    await expect(lost).toHaveCount(1);
    await lost.getByRole("button", { name: "Retirer", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    check(
      "network failure, removed/inactive reference, changed family, malformed attributes; explicit removal restores table",
    );
    await page
      .getByRole("checkbox", {
        name: "Voir seulement les différences techniques renseignées",
        exact: true,
      })
      .check();
    await expect(
      page.getByText(
        "Aucune différence technique établie dans les champs renseignés. Cela ne prouve pas la compatibilité.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Des champs sont incomplets et ne figurent pas dans ce filtre. Décochez-le pour voir les données manquantes.",
        { exact: true },
      ),
    ).toBeVisible();
    check(
      "no documented difference is not a compatibility claim; missing data still signalled with filter enabled",
    );
    mode = "ok";
    await page
      .getByRole("button", { name: "Vider la sélection", exact: true })
      .click();
    await page.goto(base + "/product/a");
    await page
      .locator(".e-product-comparison")
      .getByRole("button", {
        name: "Comparer : " + products.a.nomProduit,
        exact: true,
      })
      .click();
    await page
      .locator(".e-product-comparison")
      .getByRole("link", { name: "Comparateur (1/3)", exact: true })
      .click();
    await expect(
      page.getByText(
        "Choisissez un deuxième article dans cette famille pour commencer.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    check(
      "selection from product page and explicit guidance with a single product",
    );
    const other = await ctx.newPage();
    await other.goto(base + "/catalogue");
    await other
      .getByRole("button", {
        name: "Comparer : " + products.b.nomProduit,
        exact: true,
      })
      .click();
    await expect(page.getByRole("table")).toBeVisible();
    await other
      .getByRole("button", {
        name: "Comparer : " + products.b.nomProduit,
        exact: true,
      })
      .click();
    await expect(page.getByRole("table")).toHaveCount(0);
    await other.close();
    check("selection changes synchronized across tabs");
    await page.goto(base + "/catalogue");
    await select("b").click();
    held = true;
    await page
      .getByRole("link", { name: "Comparateur (2/3)", exact: true })
      .click();
    await expect(
      page.getByText("Vérification des prix, stocks et caractéristiques…", {
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(() => typeof release).toBe("function");
    await page
      .getByRole("button", { name: "Vider la sélection", exact: true })
      .click();
    held = false;
    release();
    await expect(
      page.getByRole("heading", {
        name: "Quelles pièces souhaitez-vous comparer ?",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    check("a late catalogue reply cannot restore a cleared selection");
    const corrupt = await context({ corrupt: true }),
      cp = await corrupt.newPage();
    await cp.goto(base + "/comparer");
    await expect(
      cp.getByRole("heading", {
        name: "Quelles pièces souhaitez-vous comparer ?",
        exact: true,
      }),
    ).toBeVisible();
    await corrupt.close();
    const denied = await context({ denied: true }),
      dp = await denied.newPage();
    await dp.goto(base + "/catalogue");
    await dp
      .getByRole("button", {
        name: "Comparer : " + products.a.nomProduit,
        exact: true,
      })
      .click();
    await expect(
      dp.getByText("Sélection conservée pour cette visite uniquement.", {
        exact: true,
      }),
    ).toBeVisible();
    await dp
      .getByRole("button", {
        name: "Comparer : " + products.b.nomProduit,
        exact: true,
      })
      .click();
    await dp
      .getByRole("link", { name: "Comparateur (2/3)", exact: true })
      .click();
    await expect(dp.getByRole("table")).toBeVisible();
    await denied.close();
    check(
      "corrupt storage recovers; denied storage reports temporary selection and still works",
    );
    const english = await context({ lang: "en" }),
      ep = await english.newPage();
    await ep.goto(base + "/catalogue");
    for (const id of ["a", "b"])
      await ep
        .getByRole("button", { name: "Compare : Test " + id, exact: true })
        .click();
    await ep
      .getByRole("link", { name: "Compare products (2/3)", exact: true })
      .click();
    await expect(
      ep.getByRole("heading", { name: "Compare components", exact: true }),
    ).toBeVisible();
    await expect(ep.getByRole("row", { name: /^Retail price/ })).toBeVisible();
    await english.close();
    check("English labels and product designation");
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    assert(
      outside.every((url) => url === "https://accounts.google.com/gsi/client"),
    );
    check(
      "no page errors or API mutations; existing Google script requests blocked, no external traffic allowed",
    );
    fs.writeFileSync(
      path.join(output, "result.json"),
      JSON.stringify(
        { checks, errors, mutations, blockedExternalRequests: outside },
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
