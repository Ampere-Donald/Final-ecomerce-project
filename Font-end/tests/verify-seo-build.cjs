// Read-only audit of the built storefront and the existing local demo API.
// No request to a provider, production API, order endpoint or authenticated account.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const {
  expect,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test");
const base = "http://127.0.0.1:5188";
const api = "http://127.0.0.1:3000";
const output = process.env.NEWOTEG_SEO_OUTPUT;
if (!output || !path.isAbsolute(output))
  throw Error("Absolute evidence directory required");
const publicPaths = [
  "/",
  "/catalogue",
  "/projets",
  "/offres",
  "/arrivages",
  "/equivalences",
  "/guides",
  "/faq",
  "/livraison",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/devis",
];
const checks = [],
  errors = [],
  forbidden = [];
fs.mkdirSync(output, { recursive: true });
const ok = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
async function head(page) {
  return page.evaluate(() => {
    const values = (selector) =>
      [...document.head.querySelectorAll(selector)].map(
        (tag) => tag.content || tag.href || tag.textContent,
      );
    return {
      title: values("title"),
      description: values('meta[name="description"]'),
      robots: values('meta[name="robots"]'),
      canonical: values('link[rel="canonical"]'),
      ogTitle: values('meta[property="og:title"]'),
      ogDescription: values('meta[property="og:description"]'),
      ogUrl: values('meta[property="og:url"]'),
      locale: values('meta[property="og:locale"]'),
      referrer: values('meta[name="referrer"]'),
      twitterTitle: values('meta[name="twitter:title"]'),
      lang: document.documentElement.lang,
    };
  });
}
async function checkHead(
  page,
  route,
  lang,
  {
    private: privatePage = false,
    noindex = false,
    canonical = true,
    loadedTitle,
  } = {},
) {
  await page.waitForLoadState("networkidle");
  if (loadedTitle)
    await expect(page).toHaveTitle(loadedTitle, { timeout: 15000 });
  await expect.poll(async () => (await head(page)).title.length).toBe(1);
  const meta = await head(page);
  for (const field of [
    "title",
    "description",
    "robots",
    "ogTitle",
    "ogDescription",
    "locale",
    "twitterTitle",
  ])
    assert.equal(meta[field].length, 1, `${route} ${lang}: ${field} unique`);
  assert(meta.title[0].trim().length > 8);
  assert(meta.description[0].trim().length > 15);
  assert.equal(meta.ogTitle[0], meta.title[0]);
  assert.equal(meta.twitterTitle[0], meta.title[0]);
  assert.equal(meta.ogDescription[0], meta.description[0]);
  assert.equal(meta.locale[0], lang === "en" ? "en_CM" : "fr_CM");
  assert.equal(meta.lang, lang);
  assert.deepEqual(meta.robots, [
    privatePage
      ? "noindex, nofollow"
      : noindex
        ? "noindex, follow"
        : "index, follow",
  ]);
  assert.deepEqual(
    meta.canonical,
    canonical && !privatePage ? ["https://newoteg.com" + route] : [],
  );
  assert.deepEqual(meta.ogUrl, meta.canonical);
  assert.deepEqual(meta.referrer, privatePage ? ["no-referrer"] : []);
  return meta;
}
(async () => {
  let browser;
  const evidence = [];
  try {
    assert.equal((await fetch(api + "/api/health")).status, 200);
    const listing = await (await fetch(api + "/api/produits?limit=1")).json();
    const product = listing.data[0];
    assert(product?.id);
    browser = await chromium.launch({
      executablePath:
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      headless: true,
    });
    for (const lang of ["fr", "en"]) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        locale: lang,
      });
      await context.addInitScript(
        (language) => localStorage.setItem("appLang", language),
        lang,
      );
      await context.route("**/*", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const demoImage =
          url.origin === "http://127.0.0.1:5187" &&
          url.pathname.startsWith("/design-e/") &&
          request.method() === "GET";
        if (url.origin !== base && !demoImage) {
          forbidden.push(url.origin + url.pathname);
          return route.abort();
        }
        if (url.pathname.startsWith("/api/")) {
          if (request.method() !== "GET") {
            forbidden.push(request.method() + " " + url.pathname);
            return route.abort();
          }
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of publicPaths) {
        await page.goto(base + route);
        evidence.push({
          route,
          lang,
          meta: await checkHead(page, route, lang),
        });
      }
      ok(
        `${lang}: 14 public routes have unique localized metadata and canonical`,
      );
      const productRoute = "/product/" + product.id;
      await page.goto(base + productRoute);
      const productHead = await checkHead(page, productRoute, lang);
      assert(
        !productHead.title[0].startsWith(
          lang === "en" ? "Product details" : "Fiche produit",
        ),
      );
      assert(productHead.title[0].includes("X-Electronic"));
      evidence.push({ route: productRoute, lang, meta: productHead });
      for (const route of [
        "/panier",
        "/suivi-invite",
        "/login",
        "/signup",
        "/forgot-password",
      ]) {
        await page.goto(base + route);
        evidence.push({
          route,
          lang,
          meta: await checkHead(page, route, lang, {
            private: true,
            canonical: false,
          }),
        });
      }
      ok(
        `${lang}: loaded product and 5 private routes without public canonical`,
      );
      for (const route of [
        "/catalogue?q=fixture",
        "/equivalences?q=fixture",
        "/comparer",
        "/missing-seo-fixture",
        "/product/00000000-0000-4000-8000-000000000000",
        "/projets/missing-seo-fixture",
      ]) {
        await page.goto(base + route);
        const filtered = route.includes("?");
        evidence.push({
          route,
          lang,
          meta: await checkHead(
            page,
            filtered ? route.split("?")[0] : route,
            lang,
            { noindex: true, canonical: filtered },
          ),
        });
      }
      await page.goto(base + "/catalogue?page=2");
      await checkHead(page, "/catalogue?page=2", lang);
      ok(`${lang}: filters, missing resources, comparison and pagination`);
      // Same document navigation must remove private/error metadata and stale overrides.
      await page.goto(base + "/suivi-invite");
      await checkHead(page, "/suivi-invite", lang, {
        private: true,
        canonical: false,
      });
      const catalogueLink = page
        .locator('a[href="/catalogue"]:visible')
        .first();
      await catalogueLink.click();
      await expect(page).toHaveURL(base + "/catalogue");
      await checkHead(page, "/catalogue", lang);
      await page.goto(base + productRoute);
      await checkHead(page, productRoute, lang);
      await page.locator('a[href="/catalogue"]:visible').first().click();
      await expect(page).toHaveURL(base + "/catalogue");
      const afterProduct = await checkHead(page, "/catalogue", lang);
      assert.equal(afterProduct.title[0], "Catalogue — X-Electronic");
      ok(`${lang}: SPA navigation removes private tags and product overrides`);
      if (lang === "fr") {
        for (const route of ["/", "/catalogue", productRoute]) {
          await page.goto(base + route);
          await page.waitForLoadState("networkidle");
          await page.screenshot({
            path: path.join(
              output,
              route === "/"
                ? "home-mobile.png"
                : route === "/catalogue"
                  ? "catalogue-mobile.png"
                  : "product-mobile.png",
            ),
            fullPage: true,
          });
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "mobile overflow",
          );
        }
      }
      await context.close();
    }
    const sitemap = await (await fetch(base + "/sitemap.xml")).text();
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(
      locations.sort(),
      publicPaths.map((route) => "https://newoteg.com" + route).sort(),
    );
    const robots = await (await fetch(base + "/robots.txt")).text();
    assert.match(robots, /Sitemap: https:\/\/newoteg.com\/sitemap.xml/);
    assert(!robots.includes("Disallow: /suivi-invite"));
    assert.deepEqual(errors, []);
    assert.deepEqual(forbidden, []);
    ok(
      "sitemap uses 14 existing public routes; no runtime error or outside/mutating request",
    );
    fs.writeFileSync(
      path.join(output, "metadata-result.json"),
      JSON.stringify(
        {
          status: "passed",
          builtPreview: base,
          localApi: api,
          demoImageOrigin: "http://127.0.0.1:5187/design-e/",
          checks,
          evidence,
          errors,
          forbidden,
          limits: [
            "JavaScript-rendered metadata; initial static fallback is generic",
            "HTTP preview is not the deployed worker",
            "No ranking, remote social crawler or production catalogue qualification proven",
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(output, "metadata-result.json"),
      JSON.stringify(
        {
          status: "failed",
          checks,
          evidence,
          errors,
          forbidden,
          failure: error.message,
        },
        null,
        2,
      ),
    );
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
})();
