// Read-only local UI + real local API recipe. Seed the guarded fictitious preview first.
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
const category = "19f0fdc7-80b6-49df-98c2-b161c18557d0";
const out =
  "C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/comparator";
const errors = [],
  forbidden = [];
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    await context.addInitScript(() => localStorage.setItem("appLang", "fr"));
    await context.route("**/*", (route) => {
      const request = route.request(),
        origin = new URL(request.url()).origin;
      if ([base, api].includes(origin) && request.method() === "GET")
        return route.continue();
      if ([base, api].includes(origin)) forbidden.push(request.url());
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/catalogue?category=" + category);
    await expect(page.getByRole("note")).toContainText("Environnement de test");
    for (const suffix of ["A", "B", "C"])
      await page
        .getByRole("button", {
          name: "Comparer : Câble de démonstration " + suffix,
          exact: true,
        })
        .click();
    await page
      .getByRole("link", { name: "Comparateur (3/3)", exact: true })
      .click();
    await expect(
      page.getByRole("row", { name: "Longueur 5 m 2 m 5 m", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("row", { name: /^Prix détail/ })).toContainText(
      "2 500",
    );
    await expect(page.getByRole("row", { name: /^Blindage/ })).toContainText(
      "Non renseigné",
    );
    fs.mkdirSync(out, { recursive: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: path.join(out, "live-comparison-" + width + ".png"),
        fullPage: true,
        animations: "disabled",
      });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(forbidden, []);
    fs.writeFileSync(
      path.join(out, "live-result.json"),
      JSON.stringify(
        {
          backend: api,
          category,
          realLocalAPI: true,
          mutations: forbidden,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS real local API: three fictitious products, technical differences, missing values, prices, mobile/desktop, no API mutation",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
