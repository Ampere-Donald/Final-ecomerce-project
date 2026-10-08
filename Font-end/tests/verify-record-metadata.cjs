const { Miniflare, convertV4MiniflareOptions } = require('miniflare');
const { build } = require('esbuild');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const output = process.env.NEWOTEG_SEO_OUTPUT;
  if (!output || !path.isAbsolute(output)) throw Error('Absolute evidence directory required');
  const bundle = await build({ entryPoints: ['worker.js'], bundle: true, write: false, format: 'esm', platform: 'browser' });
  let mode = 200;
  let runtime;
  const id = 'ee76f44c-97f3-487c-8b7b-b53801c851e4';
  const calls = [];
  try {
    const options = {
      host: '127.0.0.1', port: 0, modules: true,
      script: bundle.outputFiles[0].text, compatibilityDate: '2026-06-24',
      assets: {
        directory: path.resolve(process.env.NEWOTEG_ASSET_DIR || 'dist-release'), binding: 'ASSETS',
        routerConfig: { has_user_worker: true, invoke_user_worker_ahead_of_assets: true },
        assetConfig: { not_found_handling: 'single-page-application' },
      },
      // All outbound traffic is intercepted; no real API or production mutation.
      outboundService: request => {
        calls.push(request.url);
        assert.equal(request.url, 'https://api.newoteg.com/api/produits/' + id);
        assert.equal(request.headers.get('cookie'), null);
        assert.equal(request.headers.get('authorization'), null);
        return new Response(mode === 200 ? JSON.stringify({
          id, estActif: true, nomProduit: 'Composant de recette', description: 'Description publique',
        }) : '{}', { status: mode, headers: { 'Content-Type': 'application/json' } });
      },
    };
    runtime = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
    const origin = await runtime.ready;
    for (const [upstream, expected] of [[200, 200], [404, 404], [500, 503]]) {
      mode = upstream;
      const response = await fetch(new URL('/product/' + id, origin), {
        headers: { cookie: 'private=fixture', authorization: 'Bearer fixture' },
      });
      assert.equal(response.status, expected);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const html = await response.text();
      if (mode === 200) assert(html.includes('Composant de recette — X-Electronic</title>'));
      if (mode === 500) assert.equal(response.headers.get('retry-after'), '60');
      console.log('PASS runtime upstream ' + mode + ' -> document ' + response.status);
    }
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'record-runtime.json'), JSON.stringify({
      passed: true, cases: 3, interceptedCalls: calls.length, externalNetwork: false,
    }, null, 2));
  } finally { await runtime?.dispose(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
