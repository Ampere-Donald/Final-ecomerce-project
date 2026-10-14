// IPC child of the owned SQL recipe. No production origins or credentials.
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
  const base = process.env.REPLACEMENT_STOREFRONT_BASE,
    output = process.env.REPLACEMENT_BROWSER_OUTPUT;
  for (const url of [base, fixture.base])
    assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(url));
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const checks = [],
    errors = [],
    outside = [],
    calls = [];
  let currentPage, currentCheck;
  const endpoint = "/equivalence/cas/" + fixture.caseId;
  async function request(route, method = "GET", body, admin = true) {
    const r = await fetch(fixture.base + "/api" + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(admin ? { Authorization: "Bearer " + fixture.token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json() };
  }
  async function prepare(verdict = "DIRECT_DOCUMENTE") {
    let saved = (await request(endpoint)).data;
    const write = await request(endpoint, "PATCH", {
      ...saved,
      verdict,
      adaptations:
        verdict === "ADAPTATION_NECESSAIRE"
          ? "Brochage fictif à adapter"
          : null,
    });
    assert.equal(write.status, 200);
    saved = (await request(endpoint)).data;
    assert.equal(
      (
        await request(endpoint + "/relire", "POST", {
          version: saved.version,
          empreinte: saved.empreinteCourante,
          confirmerRelecture: true,
        })
      ).status,
      201,
    );
  }
  try {
    fs.mkdirSync(output, { recursive: true });
    for (const legacy of [false, true])
      for (const lang of ["fr", "en"])
        for (const width of [390, 768, 1440]) {
          currentCheck = { legacy, lang, width };
          fs.writeFileSync(
            path.join(output, "progress.json"),
            JSON.stringify({ running: currentCheck, completed: checks.length }),
          );
          await prepare();
          const context = await browser.newContext({
            viewport: { width, height: width === 390 ? 844 : 1000 },
            serviceWorkers: "block",
            locale: lang === "fr" ? "fr-FR" : "en-GB",
          });
          await context.addInitScript(
            (lang) => localStorage.setItem("appLang", lang),
            lang,
          );
          let registerFailure = false,
            matchingFailure = false,
            forge = false,
            registerBody;
          await context.route("**/*", async (route) => {
            const req = route.request(),
              u = new URL(req.url());
            if (u.pathname.startsWith("/api/")) {
              if (
                req.method() === "POST" &&
                [
                  "/api/equivalence/suggest",
                  "/api/equivalence/cas/rechercher",
                ].includes(u.pathname)
              ) {
                const isRegister = u.pathname.endsWith("/rechercher");
                if (isRegister) registerBody = req.postDataJSON();
                if (
                  (isRegister && registerFailure) ||
                  (!isRegister && matchingFailure)
                ) {
                  calls.push({
                    path: u.pathname,
                    status: 503,
                    injectedFailure: true,
                  });
                  return route.fulfill({
                    status: 503,
                    json: { message: "Synthetic outage" },
                  });
                }
                const r = await request(
                  u.pathname.slice(4),
                  "POST",
                  req.postDataJSON(),
                  false,
                );
                assert.equal(r.status, 201);
                for (const field of [
                  "reluParId",
                  "cmupActuel",
                  "empreinteRelue",
                  "historique",
                ])
                  assert(!JSON.stringify(r.data).includes(field));
                if (!isRegister) {
                  assert.equal(
                    r.data.suggestions.length,
                    0,
                    "Real lexical matcher should omit the fixture candidate",
                  );
                  if (forge) {
                    const known = (
                      await request(
                        "/equivalence/cas/rechercher",
                        "POST",
                        {
                          query: fixture.reference,
                          application: "Circuit fictif 1 mA",
                        },
                        false,
                      )
                    ).data.dossiers[0];
                    assert(known);
                    r.data.mode = "catalogue";
                    r.data.suggestions = [
                      {
                        ...known.produit,
                        produitId: known.produit.id,
                        dossiers: [
                          { ...known.decision, justification: "FORGED_REVIEW" },
                        ],
                        decision: known.decision,
                        raison: "Fixture catalogue suggestion",
                        compatibilite: "haute",
                      },
                    ];
                  }
                }
                calls.push({ path: u.pathname, status: r.status });
                return route.fulfill({ status: r.status, json: r.data });
              }
              assert.equal(req.method(), "GET", "Unexpected client mutation");
              return route.fulfill({ json: [] });
            }
            if (u.origin !== base) {
              outside.push(u.origin);
              return route.abort();
            }
            if (legacy && req.resourceType() === "document") {
              const r = await route.fetch();
              return route.fulfill({
                response: r,
                body: (await r.text())
                  .replace(
                    /<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,
                    "",
                  )
                  .replace(/\snomodule/g, ""),
              });
            }
            return route.continue();
          });
          const page = await context.newPage();
          page.on("pageerror", (e) => errors.push(e.message));
          currentPage = page;
          await page.goto(
            base +
              "/equivalences?query=" +
              encodeURIComponent(fixture.reference),
          );
          const results = page.locator(".e-equivalence-results"),
            application = page.locator("#equivalence-application"),
            query = page.locator("#equivalence-query");
          const submit = page.getByRole("button", {
            name:
              lang === "fr" ? "Rechercher un équivalent" : "Find an equivalent",
            exact: true,
          });
          await submit.click();
          const dossier = page.locator(".e-replacement-decision");
          await expect(dossier).toContainText(
            lang === "fr"
              ? "Remplacement direct documenté"
              : "Documented direct replacement",
          );
          await expect(dossier).toContainText(
            lang === "fr"
              ? "Son application à votre montage reste à vérifier"
              : "Its applicability to your circuit still needs checking",
          );
          assert.equal(registerBody.application, "");
          await dossier
            .getByRole("button", {
              name:
                lang === "fr"
                  ? "Rechercher pour cet usage"
                  : "Search for this use",
            })
            .click();
          await expect(application).toHaveValue("Circuit fictif 1 mA");
          await expect(dossier).toContainText(
            lang === "fr"
              ? "Dossier relu pour le montage indiqué."
              : "Reviewed dossier for the circuit you described.",
          );
          assert.equal(registerBody.application, "Circuit fictif 1 mA");
          await expect(results).toBeFocused();
          assert(
            await results.evaluate((el) => {
              const header = document.querySelector(".e-header");
              const pinned =
                header &&
                ["sticky", "fixed"].includes(getComputedStyle(header).position);
              return (
                el.getBoundingClientRect().top >=
                (pinned ? header.getBoundingClientRect().bottom : 0) - 1
              );
            }),
            "Focused results hidden beneath the header",
          );
          await dossier.locator("summary").click();
          await expect(dossier).toContainText("Synthetic original marking");
          await expect(dossier.getByRole("link")).toHaveAttribute(
            "href",
            "https://manufacturer.example/original-discovery.pdf",
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          await results.evaluate((el) => el.scrollIntoView({ block: "start" }));
          await page.screenshot({
            path: path.join(
              output,
              `${legacy ? "legacy" : "modern"}-${lang}-${width}.png`,
            ),
          });
          // Actual annotation-only review changes the evidence hash, while value/product versions stay unchanged.
          const source = (
            await request(
              "/valeurs-attribut/" + fixture.valueId + "/documentation-admin",
            )
          ).data;
          assert.equal(
            (
              await request(
                "/valeurs-attribut/" +
                  fixture.valueId +
                  "/documentation/relire",
                "POST",
                {
                  ...source.documentation,
                  version: source.documentation.version,
                  valeurVersion: source.valeurVersion,
                  attributVersion: source.attributVersion,
                  produitVersion: source.produitVersion,
                  etat: "A_VERIFIER",
                  conditions: `Changed fixture source ${legacy}-${lang}-${width}`,
                  confirmerRelecture: true,
                },
              )
            ).status,
            201,
          );
          await submit.click();
          await expect(dossier).toHaveCount(0);
          await expect(query).toHaveValue(fixture.reference);
          await expect(application).toHaveValue("Circuit fictif 1 mA");
          for (const [verdict, fr, en] of [
            [
              "ADAPTATION_NECESSAIRE",
              "Adaptation nécessaire",
              "Adaptation required",
            ],
            ["REFUSE", "Remplacement refusé", "Replacement rejected"],
            [
              "A_CONFIRMER",
              "Remplacement à confirmer",
              "Replacement needs confirmation",
            ],
          ]) {
            await prepare(verdict);
            await submit.click();
            await expect(dossier).toContainText(lang === "fr" ? fr : en);
            if (verdict === "ADAPTATION_NECESSAIRE")
              await expect(dossier).toContainText("Brochage fictif à adapter");
            else
              await expect(dossier).not.toContainText(
                "Brochage fictif à adapter",
              );
          }
          // A provider/legacy payload cannot fabricate a review when the register fails.
          registerFailure = true;
          forge = true;
          await submit.click();
          await expect(page.locator(".e-equivalence-partial")).toContainText(
            lang === "fr"
              ? "Les dossiers relus n’ont pas pu être vérifiés"
              : "Reviewed dossiers could not be checked",
          );
          await expect(dossier).toHaveCount(0);
          await expect(results).not.toContainText("FORGED_REVIEW");
          await expect(page.locator(".e-compatibility")).toContainText(
            lang === "fr" ? "Correspondance catalogue" : "Catalogue match",
          );
          registerFailure = false;
          forge = false;
          await page
            .getByRole("button", {
              name:
                lang === "fr" ? "Réessayer la recherche" : "Retry the search",
              exact: true,
            })
            .click();
          await expect(dossier).toContainText(
            lang === "fr"
              ? "Remplacement à confirmer"
              : "Replacement needs confirmation",
          );
          matchingFailure = true;
          await submit.click();
          await expect(dossier).toBeVisible();
          await expect(page.locator(".e-equivalence-partial")).toContainText(
            lang === "fr"
              ? "Les autres pistes sont indisponibles"
              : "Other suggestions are unavailable",
          );
          registerFailure = true;
          await submit.click();
          await expect(results.getByRole("alert")).toContainText(
            lang === "fr"
              ? "La recherche n’a pas abouti"
              : "The search could not be completed",
          );
          await expect(query).toHaveValue(fixture.reference);
          await expect(application).toHaveValue("Circuit fictif 1 mA");
          registerFailure = false;
          matchingFailure = false;
          await page
            .getByRole("button", {
              name: lang === "fr" ? "Réessayer" : "Try again",
              exact: true,
            })
            .click();
          await expect(dossier).toBeVisible();
          // An edit immediately removes decisions rather than retaining the previous circuit's result.
          await application.fill("Autre circuit fictif 1 MA");
          await expect(dossier).toHaveCount(0);
          await submit.click();
          await expect(dossier).toContainText(
            lang === "fr"
              ? "Son application à votre montage reste à vérifier"
              : "Its applicability to your circuit still needs checking",
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          checks.push({ legacy, lang, width, passed: true });
          await context.close();
        }
    assert.equal(checks.length, 12);
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(outside.length, 0, outside.join("\n"));
    fs.writeFileSync(
      path.join(output, "result.json"),
      JSON.stringify(
        {
          passed: true,
          fixture:
            "Synthetic only. Actual public lookup/suggestion and admin fixture source/case writes through Nest/JWT/DTO/PostgreSQL. Unrelated GET chrome and failure/provider spoofing are explicit test adapters; no real supplier, physical approval or production interaction.",
          checks,
          calls,
          errors,
          outside,
        },
        null,
        2,
      ),
    );
    console.log("Reviewed replacement client browser: 12 cases passed");
  } catch (e) {
    fs.writeFileSync(
      path.join(output, "failure.json"),
      JSON.stringify(
        {
          passed: false,
          currentCheck,
          completed: checks.length,
          error: e.message,
          errors,
          outside,
        },
        null,
        2,
      ),
    );
    if (currentPage && !currentPage.isClosed())
      await currentPage
        .screenshot({ path: path.join(output, "failure.png") })
        .catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    process.disconnect();
  }
});
