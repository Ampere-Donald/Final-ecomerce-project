// Actual workerd asset routing with the installed Miniflare runtime, no network/API.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { Miniflare, convertV4MiniflareOptions } = require("miniflare");
const runtimeOptions = (options) => convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options;
const { build } = require("esbuild");
const root = path.resolve(__dirname, "..");
const output = process.env.NEWOTEG_SEO_OUTPUT;
if (!output || !path.isAbsolute(output))
  throw Error("Absolute evidence directory required");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"),
);
assert.equal(config.assets.run_worker_first, true);
const assetDirectory = path.resolve(root, process.env.NEWOTEG_ASSET_DIR || config.assets.directory);
const checks = [],
  outbound = [];
const privatePaths = [
  "/panier",
  "/checkout",
  "/suivi-invite",
  "/Suivi-invite",
  "/mes-devis/fixture/imprimer",
  "/commandes/fixture",
  "/profile",
  "/favourites",
  "/login",
  "/signup",
  "/forgot-password",
];
const ok = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
(async () => {
  let runtime;
  try {
    const bundle = await build({
      entryPoints: [path.resolve(root, config.main)],
      bundle: true,
      write: false,
      format: "esm",
      target: "es2022",
      platform: "browser",
    });
    const options = {
      name: config.name,
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: config.compatibility_date,
      outboundService: () => {
        outbound.push("outbound attempted");
        throw Error("Outbound disabled for local asset test");
      },
      assets: {
        directory: assetDirectory,
        binding: config.assets.binding,
        routerConfig: {
          has_user_worker: true,
          invoke_user_worker_ahead_of_assets: false,
        },
        assetConfig: { not_found_handling: config.assets.not_found_handling },
      },
    };
    runtime = new Miniflare(runtimeOptions({ host: "127.0.0.1", port: 0, workers: [options] }));
    const headers = { "Sec-Fetch-Mode": "navigate", Accept: "text/html" };
    // Node fetch rewrites Sec-Fetch-Mode to cors. Raw HTTP exercises real navigation routing.
    const document = async (route, requestHeaders = headers) => {
      const url = new URL(route, await runtime.ready);
      assert.equal(url.hostname, "127.0.0.1");
      return new Promise((resolve, reject) => {
        http
          .get(url, { headers: requestHeaders }, (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () =>
              resolve(
                new Response(Buffer.concat(chunks), {
                  status: response.statusCode,
                  headers: response.headers,
                }),
              ),
            );
            response.on("error", reject);
          })
          .on("error", reject);
      });
    };
    const before = await document("/suivi-invite");
    assert.equal(before.status, 200);
    assert.equal(before.headers.get("x-robots-tag"), null);
    assert.notEqual(before.headers.get("cache-control"), "private, no-store");
    const beforeBody = await before.text();
    assert(beforeBody.includes('<div id="root"></div>'));
    ok(
      "Prior asset-first routing serves the private SPA without Worker privacy headers",
    );
    await runtime.setOptions(runtimeOptions({ host: "127.0.0.1", port: 0, workers: [{
      ...options,
      assets: {
        ...options.assets,
        routerConfig: {
          ...options.assets.routerConfig,
          invoke_user_worker_ahead_of_assets: config.assets.run_worker_first,
        },
      },
    }] }));
    for (const route of privatePaths) {
      const response = await document(route);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      assert.equal(await response.text(), beforeBody);
    }
    ok(
      "Worker-first protects 11 actual private SPA documents before JavaScript",
    );
    for (const route of [
      "/",
      "/catalogue",
      "/equivalences",
      "/comparer",
    ]) {
      const response = await document(route);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-robots-tag"), null);
      assert.notEqual(
        response.headers.get("cache-control"),
        "private, no-store",
      );
      const body = await response.text();
      if (route === '/catalogue') {
        assert(body.includes('Catalogue — X-Electronic</title>'));
        assert(body.includes('rel="canonical" href="https://newoteg.com/catalogue"'));
        assert.equal((body.match(/name="description"/g) || []).length, 1);
      }
    }
    const asset = await document("/design-e/multimetre.webp", {});
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get("x-robots-tag"), null);
    assert.equal(
      Buffer.compare(
        Buffer.from(await asset.arrayBuffer()),
        fs.readFileSync(path.join(assetDirectory, "design-e/multimetre.webp")),
      ),
      0,
    );
    assert.deepEqual(outbound, []);
    for (const route of ['/suivi-invite-extra', '/page-inexistante', '/product/a/b']) {
      const missing = await document(route);
      assert.equal(missing.status, 404);
      assert.equal(missing.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(missing.headers.get('cache-control'), 'no-store');
      assert.equal(await missing.text(), beforeBody);
    }
    ok('Unknown document URLs return real 404 with noindex and retain the application error page');
    ok(
      "Public metadata is present before JavaScript; marketing image byte-identical; no outbound request",
    );
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, "private-assets-result.json"),
      JSON.stringify(
        {
          status: "passed",
          runtime: "Installed Miniflare/workerd",
          config: {
            workerFirst: config.assets.run_worker_first,
            notFound: config.assets.not_found_handling,
          },
          checks,
          outbound,
          limits: [
            "Local asset-router configuration uses the installed Wrangler-to-Miniflare boolean mapping",
            "Not a deployed Cloudflare request; no production API/HTTPS/CDN tested",
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, "private-assets-result.json"),
      JSON.stringify(
        { status: "failed", checks, outbound, failure: error.message },
        null,
        2,
      ),
    );
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await runtime?.dispose();
  }
})();
