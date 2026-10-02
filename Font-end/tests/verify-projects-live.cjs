// Real local project/catalogue API; cart only. Block mutations and external traffic.
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
  api = "http://127.0.0.1:3000";
const slug = "demonstration-liste-materiel";
const output =
  "C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/projects";
const errors = [],
  mutations = [],
  checks = [],
  reads = [];
const ok = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
(async () => {
  const response = await fetch(api + "/api/projets/public/" + slug);
  assert.equal(response.status, 200);
  const project = await response.json();
  assert.equal(project.slug, slug);
  assert.equal(project.validationActuelle, true);
  assert(project.resume.includes("fictif"));
  assert(!JSON.stringify(project).includes("noteValidation"));
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    await ctx.addInitScript(() => localStorage.setItem("appLang", "fr"));
    await ctx.route("**/*", (route) => {
      const request = route.request(),
        u = new URL(request.url());
      if ([base, api].includes(u.origin) && request.method() === "GET") {
        if (u.origin === api) reads.push(u.pathname);
        return route.continue();
      }
      if ([base, api].includes(u.origin)) mutations.push(u.pathname);
      return route.abort();
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/projets");
    await page
      .getByRole("link", { name: project.titre, exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("heading", { name: project.titre, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Vérifier et ajouter au panier" }),
    ).toBeEnabled();
    for (const line of project.lignes) {
      const row = page
        .locator(".e-project-materials li")
        .filter({ hasText: line.referenceAttendue });
      await expect(row.getByRole("checkbox")).toBeChecked({
        checked: line.necessaire,
      });
      await expect(row.getByRole("spinbutton")).toHaveValue(
        String(line.quantite),
      );
    }
    ok(
      "Published real local API project preserves exact references and recommended choices",
    );
    fs.mkdirSync(output, { recursive: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: path.join(output, "live-detail-" + width + ".png"),
        fullPage: true,
        animations: "disabled",
      });
    }
    ok(
      "Real API page renders at mobile and desktop widths without horizontal overflow",
    );
    const before = reads.filter(
      (p) => p === "/api/projets/public/" + slug,
    ).length;
    await page
      .getByRole("button", { name: "Vérifier et ajouter au panier" })
      .click();
    await expect(page).toHaveURL(base + "/panier");
    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("newoteg_cart")),
    );
    const expected = project.lignes
      .filter((l) => l.necessaire)
      .map((l) => [
        l.produit.id,
        l.quantite,
        l.referenceAttendue,
        Number(l.produit.prixDetail),
      ]);
    assert.deepEqual(
      cart.map((p) => [p.id, p.quantity, p.reference, p.retailPrice]),
      expected,
    );
    assert.equal(
      reads.filter((p) => p === "/api/projets/public/" + slug).length,
      before + 1,
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Votre panier", exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() =>
              JSON.parse(localStorage.getItem("newoteg_cart")),
            )
          ).length,
      )
      .toBe(expected.length);
    // The pre-hydration storage already contains the old row count: wait for
    // the refreshed reference in the rendered cart, then verify the new cache.
    for (const line of project.lignes.filter((l) => l.necessaire))
      await expect(
        page
          .locator(".e-cart-line .e-reference")
          .filter({ hasText: line.referenceAttendue }),
      ).toBeVisible();
    const refreshed = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("newoteg_cart")),
    );
    assert.deepEqual(
      refreshed.map((p) => [p.id, p.quantity, p.reference, p.retailPrice]),
      expected,
    );
    ok(
      "Real API revalidation, atomic cart addition and catalogue hydration after reload",
    );
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    ok("No API mutation, order, payment or external transmission");
    fs.writeFileSync(
      path.join(output, "live-result.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          checks,
          errors,
          mutations,
          realLocalAPI: true,
          projectId: project.id,
          slug,
          reads,
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
