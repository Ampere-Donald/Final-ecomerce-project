// Owned recipe IPC only. Public fixture products come from the actual DB/service.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const {
  expect,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
assert(process.send, "Owned recipe IPC required");
process.once("message", async (fixture) => {
  const adminBase = process.env.TECHNICAL_ADMIN_BASE,
    storeBase = process.env.TECHNICAL_STOREFRONT_BASE,
    output = process.env.DICTIONARY_BROWSER_OUTPUT;
  for (const b of [fixture.base, adminBase, storeBase])
    assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(b), "Local targets only");
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  let dictionary;
  const errors = [],
    outside = [],
    calls = [],
    checks = [];
  try {
    fs.mkdirSync(output, { recursive: true });
    const admin = {
      id: "dictionary-fixture",
      nom: "Synthetic dictionary operator",
      role: "ADMIN",
    };
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    await context.addInitScript(
      ({ token, admin }) => {
        localStorage.setItem("newoteg_admin_token", token);
        localStorage.setItem("newoteg_admin_user", JSON.stringify(admin));
      },
      { token: fixture.token, admin },
    );
    await context.route("**/*", async (route) => {
      const r = route.request(),
        url = new URL(r.url());
      if (url.pathname.startsWith("/api/")) {
        if (url.pathname === "/api/admin-auth/me")
          return route.fulfill({ json: admin });
        if (/^\/api\/(attributs|valeurs-attribut)(\/|$)/.test(url.pathname)) {
          const response = await fetch(fixture.base + url.pathname, {
            method: r.method(),
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + fixture.token,
            },
            ...(r.method() === "GET" ? {} : { body: r.postData() }),
          });
          const data = await response.json();
          if (url.pathname === "/api/attributs/dictionnaire") dictionary = data;
          calls.push({
            path: url.pathname,
            method: r.method(),
            status: response.status,
          });
          return route.fulfill({ status: response.status, json: data });
        }
        return route.fulfill({ json: [] });
      }
      if (url.origin !== adminBase) {
        outside.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(adminBase + "/attributs");
    await page
      .getByLabel("Filtrer par produit, référence ou attribut")
      .fill("Boîtier recette");
    await page
      .getByRole("button", { name: "Modifier l’attribut", exact: true })
      .click();
    const select = page.getByLabel("Clé du dictionnaire");
    await expect(select).toBeEnabled();
    assert.equal(await select.locator("optgroup").count(), 7);
    assert.equal(await select.locator("option").count(), 46);
    await select.selectOption("BOITIER");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Enregistré." }),
    ).toBeVisible();
    const reread = await fetch(fixture.base + "/api" + fixture.endpoint);
    assert.deepEqual(await reread.json(), {
      etat: "A_VERIFIER",
      obsolete: true,
    });
    await page
      .getByRole("button", { name: "Modifier l’attribut", exact: true })
      .click();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(select).toHaveValue("BOITIER");
      await select.scrollIntoViewIfNeeded();
      // Resizing starts the existing sidebar transition. Verify the field is
      // actually usable after that transition, not merely present in the DOM.
      await expect
        .poll(() => select.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ) === element;
        }))
        .toBe(true);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Admin overflow",
      );
      await page.screenshot({
        path: path.join(output, `admin-${width}.png`),
        fullPage: true,
      });
    }
    await context.close();
    // Reflect the real key edit and its invalidation in the product response.
    fixture.products[0].attributs.find(
      (a) => a.id === fixture.attributeId,
    ).cleTechnique = "BOITIER";
    const packageLabel = dictionary.entries.find(
      (entry) => entry.key === "BOITIER",
    );
    fixture.products[0].attributs.find(
      (a) => a.id === fixture.attributeId,
    ).libelleTechnique = { fr: packageLabel.fr, en: packageLabel.en };
    fixture.products[0].attributs.find(
      (a) => a.id === fixture.attributeId,
    ).valeurs[0].documentation = { etat: "A_VERIFIER", obsolete: true };
    for (const legacy of [false, true])
      for (const lang of ["fr", "en"])
        for (const width of [390, 768, 1440]) {
          const c = await browser.newContext({
            viewport: { width, height: 1000 },
            serviceWorkers: "block",
          });
          await c.addInitScript(
            ({ ids, categoryId, lang }) => {
              localStorage.setItem(
                "newoteg_comparison_v1",
                JSON.stringify({ schema: 1, categoryId, ids }),
              );
              localStorage.setItem("appLang", lang);
            },
            {
              ids: fixture.products.map((p) => p.id),
              categoryId: fixture.categoryId,
              lang,
            },
          );
          await c.route("**/*", async (route) => {
            const request = route.request(),
              url = new URL(request.url());
            if (url.pathname.startsWith("/api/")) {
              assert.equal(request.method(), "GET", "No storefront writes");
              const p = fixture.products.find(
                (p) => url.pathname === "/api/produits/" + p.id,
              );
              if (p) return route.fulfill({ json: p });
              return route.fulfill({ json: [] });
            }
            if (url.origin !== storeBase) {
              outside.push(url.origin);
              return route.abort();
            }
            if (legacy && request.resourceType() === "document") {
              const response = await route.fetch(),
                body = (await response.text())
                  .replace(
                    /<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,
                    "",
                  )
                  .replace(/\snomodule/g, "");
              return route.fulfill({ response, body });
            }
            return route.continue();
          });
          const p = await c.newPage();
          p.on("pageerror", (e) => errors.push(e.message));
          await p.goto(storeBase + "/comparer");
          const packageRow = p.locator("tr").filter({
            has: p.getByRole("rowheader", {
              name: lang === "fr" ? "Boîtier" : "Package",
              exact: true,
            }),
          });
          await expect(packageRow).toContainText("TO-92");
          assert.equal(await packageRow.getByRole("cell").count(), 2);
          await expect(packageRow.getByRole("cell").nth(0)).toContainText(
            lang === "fr" ? "relecture à renouveler" : "review needs renewing",
          );
          await expect(packageRow.getByRole("cell").nth(1)).toContainText(
            lang === "fr"
              ? "Documenté après relecture"
              : "Documented after review",
          );
          const currentRow = p.locator("tr").filter({
            has: p.getByRole("rowheader", {
              name: lang === "fr" ? /Courant de sortie/ : /Output current/,
            }),
          });
          await expect(currentRow).toContainText("1 A");
          await expect(currentRow).toContainText("1000 mA");
          await expect(currentRow).toContainText(
            lang === "fr"
              ? "Même valeur après conversion"
              : "Same value after conversion",
          );
          const tensionRows = p
            .locator("tr")
            .filter({
              has: p.getByRole("rowheader", {
                name:
                  lang === "fr"
                    ? /Plage de tension d’entrée|Tension de sortie/
                    : /Input voltage range|Output voltage/,
              }),
            });
          assert.equal(await tensionRows.count(), 2);
          for (const row of await tensionRows.all())
            await expect(row).toContainText(
              lang === "fr" ? "Données incomplètes" : "Incomplete data",
            );
          assert(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "Comparator page overflow",
          );
          await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
          await p.screenshot({
            path: path.join(
              output,
              `${legacy ? "legacy" : "modern"}-${lang}-${width}.png`,
            ),
            fullPage: true,
          });
          checks.push({
            legacy,
            lang,
            width,
            semanticKeys: true,
            rolesSeparated: true,
            sourcePerProduct: true,
            unitConversion: true,
            noPageOverflow: true,
          });
          await c.close();
        }
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(outside.length, 0, outside.join("\n"));
    fs.writeFileSync(
      path.join(output, "result.json"),
      JSON.stringify(
        {
          passed: true,
          date: new Date().toISOString(),
          fixture:
            "Owned synthetic DB; real admin HTTP/JWT/DTO; public product responses from actual service with key-edit adapter; no provider or shop traffic",
          checks,
          calls,
          errors,
          outside,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS actual dictionary admin and 12 built semantic comparison cases",
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    process.disconnect();
  }
});
