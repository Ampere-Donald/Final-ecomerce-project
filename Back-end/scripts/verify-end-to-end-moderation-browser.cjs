// Called inside the owned disposable database, after a real customer purchase,
// pickup and review. No fabricated authentication or review API responses.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime =
  'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(runtime + '/playwright');
const { expect } = require(runtime + '/playwright/test');

module.exports = async ({ db, base, admin, password, review, ok, output }) => {
  const [identity] = await db.$queryRawUnsafe(
    'SELECT current_database() AS name',
  );
  assert.match(identity.name, /^newoteg_e2e_[a-f0-9]{32}$/);
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    reducedMotion: 'reduce',
  });
  const requests = [],
    errors = [],
    blocked = [],
    decisions = [];
  let dropDecision = false;
  await context.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      blocked.push(url.hostname);
      return route.abort();
    }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    try {
      const response = await route.fetch({
        url: base + url.pathname + url.search,
        maxRetries: 0,
      });
      requests.push({
        method: request.method(),
        path: url.pathname,
        status: response.status(),
      });
      if (
        request.method() === 'POST' &&
        /\/avis\/admin\/[^/]+\/moderation$/.test(url.pathname)
      ) {
        // Payloads stay in memory solely to compare exact retries; not evidence logs.
        decisions.push(request.postDataJSON());
        if (dropDecision) {
          assert.equal(
            response.status(),
            200,
            'Cut only after the real decision committed',
          );
          dropDecision = false;
          return route.abort('connectionreset');
        }
      }
      if (/\/avis\/admin\/[^/]+\/photo$/.test(url.pathname) && response.ok()) {
        assert.match(response.headers()['cache-control'], /private.*no-store/);
        assert.equal(response.headers()['referrer-policy'], 'no-referrer');
        assert.match(response.headers()['x-robots-tag'], /noindex/);
      }
      return route.fulfill({ response });
    } catch (error) {
      errors.push(error.message);
      return route.abort();
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const visit = (route) =>
    page.goto('http://127.0.0.1:5174' + route, {
      waitUntil: 'domcontentloaded',
    });
  const row = () => page.locator('[data-review-id="' + review.id + '"]');
  async function screen(name) {
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(output, name + '.png'),
      fullPage: true,
    });
  }
  async function assertPublicPhotoHidden() {
    const response = await fetch(base + '/api/avis/' + review.id + '/photo');
    assert.equal(response.status, 404, 'Pending/refused photo is never public');
  }
  try {
    await assertPublicPhotoHidden();
    await visit('/login');
    await page
      .getByLabel("Nom d'utilisateur", { exact: true })
      .fill(admin.username);
    await page.getByLabel('Mot de passe', { exact: true }).fill(password);
    await page
      .getByRole('button', { name: 'Se connecter', exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => !!localStorage.getItem('newoteg_admin_token')),
      )
      .toBe(true);
    await visit('/avis');
    await expect(
      page.getByRole('heading', { name: 'Avis clients', exact: true }),
    ).toBeVisible();
    await expect(row()).toContainText(review.texte);
    await expect(row()).toContainText('1/5');
    await row()
      .getByRole('button', { name: 'Examiner un refus', exact: true })
      .click();
    const reasons = row().getByRole('combobox', {
      name: 'Motif de contenu',
      exact: true,
    });
    assert.deepEqual(
      await reasons
        .locator('option')
        .evaluateAll((options) => options.map((o) => o.value)),
      ['', 'DONNEES_PERSONNELLES', 'INJURES_MENACES', 'SPAM', 'HORS_SUJET'],
    );
    await expect(
      row().getByRole('button', { name: 'Confirmer la décision', exact: true }),
    ).toBeDisabled();
    await row().getByRole('button', { name: 'Fermer', exact: true }).click();
    assert.equal(
      await db.avisModeration.count({ where: { avisId: review.id } }),
      0,
    );
    await row()
      .getByRole('button', { name: 'Préparer la publication', exact: true })
      .click();
    const confirm = () =>
      row().getByRole('button', { name: 'Confirmer la décision', exact: true });
    await row().getByRole('checkbox').check();
    const photo = row().getByRole('combobox', {
      name: 'Photo jointe',
      exact: true,
    });
    await expect(photo).toBeDisabled();
    await expect(confirm()).toBeDisabled();
    await row()
      .getByRole('button', { name: 'Examiner la photo jointe', exact: true })
      .click();
    await expect(
      row().getByRole('img', { name: 'Photo jointe à cet avis', exact: true }),
    ).toBeVisible();
    await expect(photo).toBeEnabled();
    await photo.selectOption('REFUSE');
    await expect(confirm()).toBeDisabled();
    await row()
      .getByRole('combobox', {
        name: 'Motif de refus de la photo',
        exact: true,
      })
      .selectOption('HORS_SUJET');
    await expect(confirm()).toBeEnabled();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await screen('moderation-negative-photo-mobile');
    dropDecision = true;
    await confirm().click();
    await expect(page.getByRole('alert')).toBeVisible();
    const committed = await db.avisProduit.findUniqueOrThrow({
      where: { id: review.id },
    });
    assert.equal(committed.statut, 'PUBLIE');
    assert.equal(committed.photoStatut, 'REFUSE');
    assert.equal(committed.note, 1);
    assert.equal(committed.texte, review.texte);
    assert.equal(committed.version, review.version + 1);
    await assertPublicPhotoHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', {
        name: 'Vérifier ou reprendre la décision',
        exact: true,
      })
      .click();
    await expect(
      page.getByText(
        'Décision enregistrée. La liste relit maintenant l’état courant.',
        { exact: true },
      ),
    ).toBeVisible();
    assert.deepEqual(decisions[0], decisions[1]);
    assert.equal(
      await db.avisModeration.count({ where: { avisId: review.id } }),
      1,
    );
    const publication = await db.avisModeration.findFirstOrThrow({
      where: { avisId: review.id },
    });
    assert.equal(publication.acteurId, admin.id);
    assert.equal(publication.action, 'PUBLIER');
    assert.equal(publication.photoAction, 'REFUSE');
    assert.equal(publication.photoMotif, 'HORS_SUJET');
    ok(
      'Actual shop login and moderation preserve compliant one-star text, refuse the synthetic photo independently and replay one committed decision',
    );

    await page.getByRole('button', { name: 'Publiés', exact: true }).click();
    await expect(row()).toBeVisible();
    await row().getByRole('button', { name: 'Répondre', exact: true }).click();
    await row()
      .getByRole('textbox', { name: 'Réponse', exact: true })
      .fill(
        'Nous prenons en compte votre retour. La boutique peut vous conseiller sur votre besoin.',
      );
    await expect(confirm()).toBeDisabled();
    await row().getByRole('checkbox').check();
    dropDecision = true;
    await confirm().click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', {
        name: 'Vérifier ou reprendre la décision',
        exact: true,
      })
      .click();
    await expect(
      page.getByText(
        'Décision enregistrée. La liste relit maintenant l’état courant.',
        { exact: true },
      ),
    ).toBeVisible();
    assert.deepEqual(decisions[2], decisions[3]);
    assert.equal(
      await db.avisModeration.count({ where: { avisId: review.id } }),
      2,
    );
    const answered = await db.avisProduit.findUniqueOrThrow({
      where: { id: review.id },
    });
    assert.equal(answered.version, review.version + 2);
    assert.equal(answered.statut, 'PUBLIE');
    assert.equal(answered.photoStatut, 'REFUSE');
    assert.equal(answered.note, 1);
    assert.equal(answered.texte, review.texte);
    await page.getByRole('button', { name: 'Publiés', exact: true }).click();
    await expect(row()).toContainText(answered.reponseBoutique);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await screen('moderation-answered-' + width);
    }
    assert.equal(decisions.length, 4);
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    ok(
      'Shop public reply survives lost response/reload with one audit entry; moderation UI verified at 360, 768 and 1440 pixels',
    );
  } catch (error) {
    await screen('moderation-failure').catch(() => {});
    fs.writeFileSync(
      path.join(output, 'moderation-failure.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => 'Unavailable'),
    );
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(output, 'moderation-browser-evidence.json'),
      JSON.stringify(
        {
          requests,
          errors,
          blockedExternalHosts: blocked,
          apiResponsesMocked: false,
          realAuthentication: true,
          fixturePhotoOnly: true,
        },
        null,
        2,
      ) + '\n',
    );
    await context.unrouteAll({ behavior: 'wait' });
    await context.close();
    await browser.close();
  }
};
