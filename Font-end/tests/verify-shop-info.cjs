// Local fixtures only. Never send email, open WhatsApp or mutate the API.
const {
  chromium,
} = require("C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const base = "http://127.0.0.1:5186";
const out = path.resolve(__dirname, "../../docs/refonte-e/captures");
const checks = [],
  errors = [],
  mutations = [],
  external = [];
const ok = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "fr-FR",
      reducedMotion: "reduce",
    });
    await context.route("**/*", (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (url.pathname.startsWith("/api/")) {
        if (req.method() !== "GET") mutations.push(url.pathname);
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.pathname === "/api/produits"
              ? { data: [], meta: { total: 0, lastPage: 1 } }
              : [],
          ),
        });
      }
      if (url.origin !== base) {
        external.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    async function goto(url) {
      await page.goto(base + url);
      await page.locator("h1").waitFor();
    }
    await goto("/contact");
    assert.equal(await page.locator('a[href="tel:+237699966160"]').count(), 1);
    assert.equal(
      await page.locator('a[href="https://wa.me/237699966160"]').count(),
      1,
    );
    await page.getByLabel("Votre nom", { exact: true }).fill("Client QA");
    await page
      .getByLabel("Votre e-mail", { exact: true })
      .fill("qa@example.invalid");
    await page
      .getByLabel("Sujet", { exact: true })
      .fill("Devis A&B + connectique");
    await page
      .getByLabel("Votre message", { exact: true })
      .fill("Référence <script>test</script> & quantité : 2\nMerci.");
    await page.getByRole("button", { name: "Préparer mon e-mail" }).click();
    await page
      .getByRole("heading", { name: "Votre e-mail est prêt à être ouvert" })
      .waitFor();
    const href = await page
      .getByRole("link", { name: "Ouvrir ma messagerie" })
      .getAttribute("href");
    const emailUrl = new URL(href);
    assert.equal(emailUrl.pathname, "contact@newoteg.com");
    assert.equal(
      emailUrl.searchParams.get("subject"),
      "Devis A&B + connectique",
    );
    assert(
      emailUrl.searchParams
        .get("body")
        .includes("Référence <script>test</script> & quantité : 2\nMerci."),
    );
    assert.equal(await page.locator(".e-contact-draft script").count(), 0);
    await page
      .getByText(
        "Il n’a pas encore été envoyé. L’envoi se fait depuis votre messagerie.",
      )
      .waitFor();
    await page.getByLabel("Sujet", { exact: true }).fill("Sujet corrigé");
    assert.equal(await page.locator(".e-contact-draft").count(), 0);
    assert.equal(
      await page.locator("textarea[name=message]").inputValue(),
      "Référence <script>test</script> & quantité : 2\nMerci.",
    );
    ok(
      "Contact prepares an encoded email, preserves user text, clears stale preview and never claims delivery",
    );
    await goto("/about");
    await page
      .getByRole("button", { name: "Agrandir la photo de la boutique" })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page
      .getByText("Rencontrer l’équipe NEWOTEG", { exact: true })
      .click();
    assert.equal(await page.locator(".e-team-list article").count(), 13);
    await page
      .getByText("La vie de la boutique en images", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Vidéo de la boutique 1", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.locator("video[autoplay]").count(), 0);
    assert((await page.locator("video").getAttribute("controls")) !== null);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("video").count(), 0);
    ok(
      "About preserves team, keyboard-close photo modal and on-demand video without autoplay",
    );
    for (const lang of ["fr", "en"]) {
      await page.evaluate(
        (value) => localStorage.setItem("appLang", value),
        lang,
      );
      const translations = (
        await import(
          pathToFileURL(path.resolve(__dirname, `../src/i18n/${lang}.js`))
        )
      ).default;
      for (const prefix of ["terms", "privacy"]) {
        await goto("/" + prefix);
        const text = await page.locator(".e-legal-text").innerText();
        for (const [key, value] of Object.entries(translations[prefix]))
          if (/^s\d+(Title|P\d+|L\d+)$/.test(key))
            assert(
              text.includes(value.replace(/<\/?strong>/g, "")),
              `${lang}/${prefix} missing ${key}`,
            );
        assert.equal(await page.locator(".e-legal-text > section").count(), 8);
        await page.locator(`.e-legal-toc a[href="#${prefix}-5"]`).click();
        await page.waitForURL(`**/#${prefix}-5`.replace("/#", "#"));
        const top = await page
          .locator(`#${prefix}-5`)
          .evaluate((el) => el.getBoundingClientRect().top);
        assert(top >= 100, "Anchor hidden under header");
        assert(
          !(await page
            .locator(".e-page-lead")
            .innerText()
            .then((text) =>
              text.includes(new Date().toLocaleDateString("fr-FR")),
            )),
        );
      }
    }
    ok(
      "All existing legal sections and clauses retained verbatim in both languages; anchors work; no fake daily update date",
    );
    await page.evaluate(() => localStorage.setItem("appLang", "fr"));
    await goto("/missing-page-qa");
    await page.getByLabel("Rechercher une référence").fill("HDMI & adaptateur");
    await page
      .getByRole("button", { name: "Rechercher dans le catalogue" })
      .click();
    await page.waitForURL("**/catalogue?search=HDMI%20%26%20adaptateur");
    ok("404 search preserves the query and routes to catalogue");
    for (const lang of ["fr", "en"]) {
      await page.evaluate(
        (value) => localStorage.setItem("appLang", value),
        lang,
      );
      for (const width of [360, 390, 768, 1000, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const [slug, url] of [
          ["a-propos", "/about"],
          ["contact", "/contact"],
          ["conditions", "/terms"],
          ["confidentialite", "/privacy"],
          ["introuvable", "/missing-page-qa"],
        ]) {
          await goto(url);
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${slug}/${lang} overflow ${width}`,
          );
          if (lang === "fr" && [390, 1440].includes(width)) {
            await page.evaluate(async () => {
              await Promise.all(
                [...document.images]
                  .filter((img) => img.loading !== "lazy")
                  .map((img) => img.decode().catch(() => {})),
              );
              window.scrollTo({ top: 0, behavior: "instant" });
            });
            await page.screenshot({
              path: path.join(out, `${slug}-${width}.png`),
              fullPage: true,
              animations: "disabled",
            });
          }
        }
      }
    }
    ok(
      "Five pages responsive in French and English at 360, 390, 768, 1000 and 1440 px",
    );
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "verification-institutionnel.json"),
      JSON.stringify(
        {
          checks,
          errors,
          interceptedMutations: mutations,
          blockedExternalOrigins: [...new Set(external)],
          fixtureOnly: true,
          date: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
