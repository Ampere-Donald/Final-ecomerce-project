// Internal lab budgets fixed before the first run. This is not field CWV/INP.
const budgets = { lcpMs: 2500, cls: 0.1, scriptEncodedBytes: 220 * 1024 };
const profile = {
  viewport: { width: 390, height: 844 },
  latencyMs: 150,
  downstreamBytesPerSecond: 200000,
  upstreamBytesPerSecond: 93750,
  cpuSlowdown: 4,
  coldCache: true,
  samplesPerRoute: 3,
};
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const production = process.env.NEWOTEG_LAB_PRODUCTION === "1";
const base = production ? "https://newoteg.com" : "http://127.0.0.1:5188",
  output = process.env.NEWOTEG_SEO_OUTPUT;
if (!output || !path.isAbsolute(output))
  throw Error("Absolute evidence directory required");
fs.mkdirSync(output, { recursive: true });
const results = [],
  errors = [],
  forbidden = [];
(async () => {
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      headless: true,
    });
    for (const route of ["/", "/catalogue"])
      for (let sample = 1; sample <= profile.samplesPerRoute; sample++) {
        const context = await browser.newContext({
          viewport: profile.viewport,
        });
        await context.route("**/*", (request) => {
          const url = new URL(request.request().url());
          const productionAsset = production && (
            (url.origin === "https://res.cloudinary.com" && url.pathname.startsWith("/dm4ij9sxg/image/upload/")) ||
            (url.origin === "https://static.cloudflareinsights.com" && url.pathname.startsWith("/beacon.min.js/"))
          );
          // Exclude analytics submissions, never create production records.
          if (production && url.pathname === "/cdn-cgi/rum") return request.abort();
          const demoImage =
            !production && url.origin === "http://127.0.0.1:5187" &&
            url.pathname.startsWith("/design-e/");
          if (
            (url.origin !== base && !demoImage && !productionAsset && !(production && url.origin === "https://api.newoteg.com" && (url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/api/")))) ||
            request.request().method() !== "GET"
          ) {
            forbidden.push(
              request.request().method() + " " + url.origin + url.pathname,
            );
            return request.abort();
          }
          return request.continue();
        });
        await context.addInitScript(() => {
          localStorage.setItem("appLang", "fr");
          window.__lab = { lcpMs: null, cls: 0, longTasks: [], shifts: [] };
          let sessionValue = 0,
            sessionStart = 0,
            lastShift = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__lab.lcpMs = entry.startTime;
              window.__lab.lcpElement = entry.element?.tagName || null;
              window.__lab.lcpPath = entry.url
                ? new URL(entry.url).pathname
                : null;
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.hadRecentInput) continue;
              if (
                entry.startTime - lastShift < 1000 &&
                entry.startTime - sessionStart < 5000
              )
                sessionValue += entry.value;
              else {
                sessionValue = entry.value;
                sessionStart = entry.startTime;
              }
              lastShift = entry.startTime;
              window.__lab.cls = Math.max(window.__lab.cls, sessionValue);
              window.__lab.shifts.push({
                time: entry.startTime,
                value: entry.value,
              });
            }
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            window.__lab.longTasks.push(
              ...list
                .getEntries()
                .map((entry) => ({
                  start: entry.startTime,
                  duration: entry.duration,
                })),
            );
          }).observe({ type: "longtask", buffered: true });
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: profile.latencyMs,
          downloadThroughput: profile.downstreamBytesPerSecond,
          uploadThroughput: profile.upstreamBytesPerSecond,
          connectionType: "cellular3g",
        });
        await cdp.send("Emulation.setCPUThrottlingRate", {
          rate: profile.cpuSlowdown,
        });
        await page.goto(base + route, {
          waitUntil: "networkidle",
          timeout: 60000,
        });
        await page.locator("main h1").waitFor({ timeout: 30000 });
        // Observe five seconds after network idle; final load candidate is retained.
        await page.waitForTimeout(5000);
        const measure = await page.evaluate(() => ({
          ...window.__lab,
          resources: performance
            .getEntriesByType("resource")
            .map((entry) => ({
              path: new URL(entry.name).pathname,
              type: entry.initiatorType,
              encoded: entry.encodedBodySize,
              decoded: entry.decodedBodySize,
              duration: entry.duration,
            })),
          document: {
            encoded:
              performance.getEntriesByType("navigation")[0].encodedBodySize,
            decoded:
              performance.getEntriesByType("navigation")[0].decodedBodySize,
          },
          overflow: document.documentElement.scrollWidth > innerWidth,
        }));
        const scripts = measure.resources.filter((entry) =>
          entry.path.endsWith(".js"),
        );
        const scriptEncodedBytes = scripts.reduce(
          (sum, entry) => sum + entry.encoded,
          0,
        );
        const row = {
          route,
          sample,
          ...measure,
          scriptEncodedBytes,
          budgetPass: {
            lcp:
              Number.isFinite(measure.lcpMs) && measure.lcpMs <= budgets.lcpMs,
            cls: measure.cls <= budgets.cls,
            scriptBytes:
              scriptEncodedBytes > 0 &&
              scriptEncodedBytes <= budgets.scriptEncodedBytes,
          },
        };
        results.push(row);
        console.log(
          JSON.stringify({
            route,
            sample,
            lcpMs: row.lcpMs,
            cls: row.cls,
            scriptEncodedBytes,
            budgetPass: row.budgetPass,
          }),
        );
        assert.equal(measure.overflow, false);
        if (sample === 1)
          await page.screenshot({
            path: path.join(
              output,
              route === "/" ? "home-throttled.png" : "catalogue-throttled.png",
            ),
            fullPage: true,
          });
        await context.close();
      }
    assert.deepEqual(errors, []);
    assert.deepEqual(forbidden, []);
    fs.writeFileSync(
      path.join(output, "mobile-lab-result.json"),
      JSON.stringify(
        {
          status: results.every((row) =>
            Object.values(row.budgetPass).every(Boolean),
          )
            ? "budgets-passed"
            : "budgets-missed",
          budgets,
          profile,
          results,
          errors,
          forbidden,
          limits: [
            "Synthetic desktop Edge viewport/CPU/network, not a physical mobile device",
            production ? "Public production GET requests only, live catalogue and HTTPS, analytics submissions excluded; not directly comparable with demo measurements" : "Local demo API/data through real Vite proxy; fixture images on local 5187/design-e, no remote CDN/HTTPS or production image catalogue",
            "Load LCP/CLS observed for 5s after network idle, not field percentiles or INP",
            "Modern browser path only; legacy build not exercised",
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(output, "mobile-lab-result.json"),
      JSON.stringify(
        {
          status: "failed",
          budgets,
          profile,
          results,
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
