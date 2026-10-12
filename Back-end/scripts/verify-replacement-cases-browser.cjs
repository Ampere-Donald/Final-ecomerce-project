// Owned local synthetic DB recipe only. The JWT is passed via IPC, never saved.
const {
  chromium,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {
  expect,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
assert(process.send, 'Use the owner-checked database recipe');
process.once('message', async (fixture) => {
  const base = process.env.TECHNICAL_ADMIN_BASE,
    output = process.env.TECHNICAL_BROWSER_OUTPUT;
  for (const url of [base, fixture.base])
    assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(url));
  const calls = [],
    errors = [],
    outside = [];
  const request = async (route, method = 'GET', body) => {
    const r = await fetch(fixture.base + '/api' + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + fixture.token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json() };
  };
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  try {
    fs.mkdirSync(output, { recursive: true });
    const admin = {
      id: 'synthetic-ui',
      nom: 'Administrateur de recette',
      role: 'ADMIN',
    };
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
      serviceWorkers: 'block',
    });
    await context.addInitScript(
      ({ token, admin }) => {
        localStorage.setItem('newoteg_admin_token', token);
        localStorage.setItem('newoteg_admin_user', JSON.stringify(admin));
      },
      { token: fixture.token, admin },
    );
    await context.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.pathname.startsWith('/api/')) {
        if (u.pathname === '/api/admin-auth/me')
          return route.fulfill({ json: admin });
        if (
          /^\/api\/(equivalence\/cas|valeurs-attribut)(\/|$)/.test(u.pathname)
        ) {
          const response = await request(
            u.pathname.slice(4) + u.search,
            route.request().method(),
            route.request().postDataJSON(),
          );
          calls.push({
            path: u.pathname,
            method: route.request().method(),
            status: response.status,
          });
          return route.fulfill({
            status: response.status,
            json: response.data,
          });
        }
        // Product search/session chrome are fixture adapters; case/evidence APIs are real.
        if (u.pathname === '/api/produits')
          return route.fulfill({ json: { data: [fixture.piece] } });
        return route.fulfill({ json: [] });
      }
      if (u.origin !== base) {
        outside.push(u.origin);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/cas-remplacement');
    await page.getByRole('button', { name: 'Nouveau cas' }).click();
    await expect(
      page.getByRole('button', { name: 'Confirmer la relecture du cas' }),
    ).toBeDisabled();
    await page
      .getByLabel('Chercher : Pièce proposée', { exact: true })
      .fill('Replacement');
    await expect(
      page.getByLabel('Pièce proposée', { exact: true }).locator('option'),
    ).toHaveCount(2);
    await page
      .getByLabel('Pièce proposée', { exact: true })
      .selectOption(fixture.piece.id);
    await page
      .locator('section[aria-label^="Preuves de"] input[type=checkbox]')
      .check();
    for (const [label, value] of [
      ['Référence exacte recherchée', 'UI-FIXTURE-B'],
      ['Usage et conditions du montage', 'Circuit de recette fictif'],
      ['Motif de la décision', 'Relecture synthétique uniquement'],
      ['Limites du remplacement', 'Aucune approbation de pièce réelle'],
      [
        'Source HTTPS de la pièce recherchée',
        'https://manufacturer.example/ui-fixture.pdf',
      ],
      ['Document de la pièce recherchée', 'Fiche originale fictive'],
      ['Page ou section de la pièce recherchée', 'Tableau 2'],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page
      .getByLabel('Décision technique')
      .selectOption('ADAPTATION_NECESSAIRE');
    await page
      .getByLabel('Adaptations à effectuer')
      .fill('Adapter le brochage fictif');
    await page
      .getByRole('button', { name: 'Enregistrer le brouillon' })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Brouillon enregistré' }),
    ).toBeVisible();
    const row = (await request('/equivalence/cas')).data.find(
      (r) => r.reference === 'UI-FIXTURE-B',
    );
    assert(row);
    const endpoint = '/equivalence/cas/' + row.id;
    const confirmation = page.getByRole('checkbox', {
      name: /J’ai relu les documents/,
    });
    await confirmation.check();
    // Annotation-only edit invalidates the saved evidence hash without changing the value.
    let source = (
      await request(
        '/valeurs-attribut/' + fixture.value + '/documentation-admin',
      )
    ).data;
    assert.equal(
      (
        await request(
          '/valeurs-attribut/' + fixture.value + '/documentation/relire',
          'POST',
          {
            ...source.documentation,
            version: source.documentation.version,
            valeurVersion: source.valeurVersion,
            attributVersion: source.attributVersion,
            produitVersion: source.produitVersion,
            etat: 'A_VERIFIER',
            conditions: 'Condition modifiée hors du navigateur',
            confirmerRelecture: true,
          },
        )
      ).status,
      201,
    );
    await page
      .getByRole('button', { name: 'Confirmer la relecture du cas' })
      .click();
    await expect(page.getByRole('alert')).toContainText(
      'Votre saisie est conservée',
    );
    await expect(page.getByLabel('Adaptations à effectuer')).toHaveValue(
      'Adapter le brochage fictif',
    );
    await expect(
      page.getByRole('button', { name: 'Enregistrer le brouillon' }),
    ).toBeDisabled();
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', { name: 'Recharger la dernière version' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Enregistrer le brouillon' }),
    ).toBeEnabled();
    await confirmation.check();
    await page
      .getByRole('button', { name: 'Confirmer la relecture du cas' })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Relecture enregistrée' }),
    ).toBeVisible();
    let saved = (await request(endpoint)).data;
    assert(saved.reluActuel);
    assert.equal(saved.historique.length, 1);
    const historicSource =
      saved.historique[0].preuve.values[0].documentation.sourceDocument;
    await page
      .getByLabel('Limites du remplacement')
      .fill('Limites locales à conserver');
    assert(!(await confirmation.isChecked()));
    await expect(confirmation).toBeDisabled();
    // A concurrent real write makes the browser's save stale.
    assert.equal(
      (
        await request(endpoint, 'PATCH', {
          ...saved,
          version: saved.version,
          limites: 'Autre modification de recette',
        })
      ).status,
      200,
    );
    await page
      .getByRole('button', { name: 'Enregistrer le brouillon' })
      .click();
    await expect(page.getByRole('alert')).toContainText(
      'Votre saisie est conservée',
    );
    await expect(page.getByLabel('Limites du remplacement')).toHaveValue(
      'Limites locales à conserver',
    );
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', { name: 'Recharger la dernière version' })
      .click();
    await expect(page.getByLabel('Limites du remplacement')).toHaveValue(
      'Autre modification de recette',
    );
    await expect(page.getByText(/La précédente relecture/)).toBeVisible();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
      // Wait for the responsive sidebar transition, including its left edge;
      // a field centre can be clickable while labels are still covered.
      await expect.poll(() => page.locator('aside[aria-label="Navigation administrateur"]').evaluate(el => {
        const r = el.getBoundingClientRect();
        return innerWidth < 768 ? r.right <= 0.5 : Math.abs(r.x) < 0.5 && Math.abs(r.width - (innerWidth < 1200 ? 80 : 272)) < 0.5;
      })).toBe(true);
      const field = page.getByLabel('Référence exacte recherchée');
      await field.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          field.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            );
          }),
        )
        .toBe(true);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await field.fill('UI-FIXTURE-B');
      await expect(field).toHaveValue('UI-FIXTURE-B');
      await page.screenshot({
        path: path.join(output, `dossier-${width}.png`),
      });
      const save = page.getByRole('button', {
        name: 'Enregistrer le brouillon',
      });
      await save.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          save.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            );
          }),
        )
        .toBe(true);
      await page.screenshot({
        path: path.join(output, `actions-${width}.png`),
      });
    }
    // After saving local edits, review remains a separate human action.
    await page
      .getByRole('button', { name: 'Enregistrer le brouillon' })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Brouillon enregistré' }),
    ).toBeVisible();
    await confirmation.check();
    await page
      .getByRole('button', { name: 'Confirmer la relecture du cas' })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Relecture enregistrée' }),
    ).toBeVisible();
    saved = (await request(endpoint)).data;
    assert.equal(saved.historique.length, 2);
    assert.equal(
      saved.historique[1].preuve.values[0].documentation.sourceDocument,
      historicSource,
    );
    await page.getByLabel(/Retirer ce cas/).check();
    await page
      .getByRole('button', { name: 'Enregistrer le brouillon' })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Brouillon enregistré' }),
    ).toBeVisible();
    saved = (await request(endpoint)).data;
    assert(saved.retire);
    assert.equal(saved.reluActuel, false);
    assert.equal(saved.historique.length, 2);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(outside.length, 0, outside.join('\n'));
    assert(calls.filter((c) => c.status === 409).length === 2);
    assert(calls.some((c) => c.method === 'POST' && c.status === 201));
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          passed: true,
          fixture:
            'Synthetic only; built admin and actual case/evidence/source Nest/JWT/DTO/PostgreSQL. Session lookup, product search and unrelated chrome are fixture adapters.',
          checks: [
            'create with selected evidence',
            'adaptations',
            'source-only stale hash conflict',
            'concurrent save conflict',
            'input preservation',
            'explicit reload/review',
            'immutable history',
            'retirement',
            '390/768/1440 interactive controls',
          ],
          calls,
          errors,
          outside,
        },
        null,
        2,
      ),
    );
    await context.close();
    console.log('Replacement admin browser passed');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    process.disconnect();
  }
});
