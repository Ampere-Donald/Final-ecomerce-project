import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

// Reproducible Node runtime for the existing React catalogue. It is built from
// source, never downloaded or evaluated from a visitor's requested URL.
export async function buildCataloguePackage(root, env, outDir) {
  root = resolve(root); outDir = resolve(outDir);
  // Vite empties this directory. Only our two generated workspace targets may
  // be used; a mistyped --output must never erase another directory.
  if (![resolve(root, '.catalogue-backend'), resolve(root, '../Back-end/.storefront-renderer')].includes(outDir))
    throw Error('Catalogue output must be an owned generated directory');
  await build({ configFile: false, root, plugins: [react()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production'),
      ...Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith('VITE_'))
        .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])) },
    resolve: { alias: { 'react-dom/server.browser': 'react-dom/server.node' } },
    ssr: { target: 'node', noExternal: true },
    build: { ssr: resolve(root, 'src/storefront/serverCataloguePackage.jsx'), outDir,
      emptyOutDir: true, minify: true, target: 'node20',
      rollupOptions: { output: { format: 'cjs', entryFileNames: 'renderer.cjs' } } },
  });
  const bundle = await readFile(resolve(outDir, 'renderer.cjs'));
  const bundleSha256 = createHash('sha256').update(bundle).digest('hex');
  const identity = createHash('sha256').update(bundle);
  // App/main determine the client hydration shell; include them even if they
  // are not imported by the server entry. Normalize checkout line endings.
  for (const file of ['src/App.jsx', 'src/main.jsx']) identity.update((await readFile(resolve(root, file), 'utf8')).replace(/\r\n/g, '\n'));
  const manifest = { protocol: 1, rendererId: identity.digest('hex'), bundleSha256, file: 'renderer.cjs' };
  await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
