// IPC child of the owned PostgreSQL recipe. Build UI -> actual local HTTP/SQL.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const {
  expect,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
assert(process.send, "Owned recipe IPC required");
process.once("message", async (fixture) => {
  const base = process.env.EQUIVALENCE_STOREFRONT_BASE,
    output = process.env.EQUIVALENCE_BROWSER_OUTPUT;
  for (const value of [base, fixture.base])
    assert(
      /^http:\/\/127\.0\.0\.1:\d+$/.test(value),
      "Owned localhost required",
    );
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const checks = [],
    errors = [],
    outside = [],
    writes = [];
  try {
    fs.mkdirSync(output, { recursive: true });
    for (const legacy of [false, true])
      for (const lang of ["fr", "en"])
        for (const width of [390, 768, 1440]) {
          const context = await browser.newContext({
            viewport: { width, height: 1000 },
            serviceWorkers: "block",
            locale: lang === "fr" ? "fr-FR" : "en-GB",
          });
          await context.addInitScript(
            (lang) => localStorage.setItem("appLang", lang),
            lang,
          );
          let lastBody,
            empty = false,
            limited = false;
          await context.route("**/*", async (route) => {
            const request = route.request(),
              url = new URL(request.url());
            if (url.pathname.startsWith("/api/")) {
              if (
                request.method() === "POST" &&
                url.pathname === "/api/equivalence/suggest"
              ) {
                lastBody = request.postDataJSON();
                if (limited) {
                  limited = false;
                  return route.fulfill({
                    status: 429,
                    json: { message: "Fixture rate limit" },
                  });
                }
                const r = await fetch(
                  fixture.base + "/api/equivalence/suggest",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: request.postData(),
                  },
                );
                const data = await r.json();
                assert.equal(r.status, 201);
                assert.equal(data.mode, "catalogue");
                assert.equal(
                  data.suggestions[0].produitId,
                  fixture.candidateId,
                );
                assert(!JSON.stringify(data).includes("reluParId"));
                assert(!JSON.stringify(data).includes("cmupActuel"));
                if (empty) data.suggestions[0].caracteristiques = [];
                return route.fulfill({ status: r.status, json: data });
              }
              if (request.method() !== "GET") {
                writes.push(url.pathname);
                return route.abort();
              }
              if (url.pathname === "/api/produits")
                return route.fulfill({
                  json: { data: [], meta: { total: 0, lastPage: 1 } },
                });
              return route.fulfill({ json: [] });
            }
            if (url.origin !== base) {
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
          const page = await context.newPage();
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto(base + "/equivalences?query=BC547P");
          const application = page.locator("#equivalence-application"),
            query = page.locator("#equivalence-query");
          await expect(application).toHaveAttribute("maxlength", "500");
          await query.focus();
          await query.press("Tab");
          await expect(application).toBeFocused();
          await application.fill("Synthetic circuit 5 V, review pinout");
          const submit = page.getByRole("button", {
            name:
              lang === "fr" ? "Rechercher un équivalent" : "Find an equivalent",
            exact: true,
          });
          await submit.click();
          const sources = page.locator(".e-equivalent-sources");
          await expect(sources).toBeVisible();
          await expect(page.locator(".e-equivalence-results")).toBeFocused();
          assert(
            await page.evaluate(() => {
              const results = document
                .querySelector(".e-equivalence-results")
                .getBoundingClientRect();
              const header = document.querySelector(".e-header");
              return (
                results.top >= 0 &&
                (getComputedStyle(header).position !== "sticky" ||
                  results.top >= header.getBoundingClientRect().bottom)
              );
            }),
            "Focused results hidden by header",
          );
          assert.deepEqual(lastBody, {
            query: "BC547P",
            source: "ecommerce",
            application: "Synthetic circuit 5 V, review pinout",
          });
          await expect(page.locator(".e-equivalence-results")).toContainText(
            "Synthetic circuit 5 V, review pinout",
          );
          await sources.locator("> summary").click();
          await expect(sources).toContainText("BC547P");
          const source = sources.locator(".e-technical-source");
          await source.locator("summary").click();
          await expect(source).toContainText("Synthetic only");
          await expect(source).toContainText("Page 1");
          await expect(source.getByRole("link")).toHaveAttribute(
            "href",
            "https://manufacturer.example/fixture.pdf",
          );
          await expect(page.locator(".e-compatibility")).toContainText(
            lang === "fr" ? "Correspondance catalogue" : "Catalogue match",
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "Page overflow",
          );
          // Full-page capture must start at the top: otherwise fixed/sticky elements
          // are painted at the current viewport offset in the stitched image.
          await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
          await expect(page.locator(".e-header")).toBeInViewport();
          assert(
            await page
              .locator(".e-skip")
              .evaluate(
                (el) =>
                  document.activeElement !== el &&
                  el.getBoundingClientRect().bottom <= 0,
              ),
            "Unfocused skip link visible",
          );
          await page.screenshot({
            path: path.join(
              output,
              `${legacy ? "legacy" : "modern"}-${lang}-${width}.png`,
            ),
            fullPage: true,
          });
          await application.fill("Updated synthetic constraints");
          await expect(sources).toHaveCount(0);
          limited = true;
          await submit.click();
          await expect(page.getByRole("alert")).toBeVisible();
          await expect(application).toHaveValue(
            "Updated synthetic constraints",
          );
          await expect(query).toHaveValue("BC547P");
          await page
            .getByRole("button", {
              name: lang === "fr" ? "Réessayer" : "Try again",
              exact: true,
            })
            .click();
          await expect(sources).toBeVisible();
          await application.fill("No sources fixture");
          empty = true;
          await submit.click();
          await expect(
            page.locator(".e-equivalent-source-empty"),
          ).toBeVisible();
          await expect(sources).toHaveCount(0);
          checks.push({
            legacy,
            lang,
            width,
            realHttpAndSql: true,
            sourceDetails: true,
            applicationSent: true,
            keyboard: true,
            resultFocusUnobscured: true,
            clearedOnEdit: true,
            retryPreservesInput: true,
            emptySourceAdapter: true,
            noOverflow: true,
          });
          await context.close();
        }
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(outside.length, 0, outside.join("\n"));
    assert.equal(writes.length, 0, writes.join("\n"));
    const report = {
      passed: true,
      date: new Date().toISOString(),
      fixture: "Owned synthetic PostgreSQL/HTTP, no provider or shop writes",
      checks,
      errors,
      outside,
      writes,
    };
    fs.writeFileSync(
      path.join(output, "result.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
});
