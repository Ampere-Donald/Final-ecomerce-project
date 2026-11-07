import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { buildCataloguePackage } from './cataloguePackage.js';
import { createRequire } from 'node:module';
import { editorialDocumentPaths } from '../src/storefront/editorialRoutes.js';

export default function buildCatalogueRenderer() {
  let config;
  return {
    name: 'newoteg-catalogue-renderer', apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      // Production's Worker imports the renderer identity and stylesheet list.
      // Every normal build must regenerate them: an optional environment flag
      // would let a future clean deployment omit or reuse stale artifacts.
      if (!config.build.write) return;
      const output = resolve(config.root, '.catalogue-ssr');
      await build({ configFile: false, root: config.root, plugins: [react()],
        define: Object.fromEntries(Object.entries(config.env).filter(([key]) => key.startsWith('VITE_'))
          .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
        ssr: { target: 'webworker', noExternal: true },
        build: { ssr: resolve(config.root, 'src/storefront/serverCatalogue.jsx'), outDir: output,
          emptyOutDir: true, minify: true, target: 'es2022', rollupOptions: { output: { entryFileNames: 'renderer.js' } } },
      });
      const manifest = JSON.parse(await readFile(resolve(config.root, config.build.outDir, '.vite/manifest.json'), 'utf8'));
      const styles = new Set(), seen = new Set();
      function visit(key) {
        if (seen.has(key)) return;
        seen.add(key);
        if (!manifest[key]) throw Error('Missing catalogue manifest entry');
        for (const css of manifest[key].css || []) styles.add('/' + css);
        for (const child of manifest[key].imports || []) visit(child);
      }
      visit('index.html');
      for (const name of ['Catalogue', 'Product']) {
        const source = `src/storefront/${name}.jsx`;
        const candidates = manifest[source] ? [source] : [...new Set(manifest['index.html']?.dynamicImports || [])]
          .filter(key => manifest[key]?.name === name && manifest[key]?.isDynamicEntry);
        if (candidates.length !== 1) throw Error(`Missing unique ${name} manifest entry`);
        visit(candidates[0]);
      }
      await writeFile(resolve(output, 'styles.js'), `export const catalogueStyles = ${JSON.stringify([...styles])};\n`);
      styles.clear(); seen.clear(); visit('index.html');
      const editorialSource = 'src/storefront/TechnicalLibrary.jsx';
      if (!manifest[editorialSource]) throw Error('Missing editorial manifest entry');
      visit(editorialSource);
      const editorialStyles = [...styles];
      await buildCataloguePackage(config.root, config.env, resolve(config.root, '.catalogue-backend'));
      const require = createRequire(import.meta.url);
      const rendererFile = resolve(config.root, '.catalogue-backend/renderer.cjs');
      delete require.cache[require.resolve(rendererFile)];
      const renderer = require(rendererFile);
      const fragments = Object.fromEntries(editorialDocumentPaths().map(path => [path, renderer.renderEditorialResponse(path)]));
      await writeFile(resolve(output, 'editorial.js'), `export const editorialFragments = ${JSON.stringify(fragments)};\nexport const editorialStyles = ${JSON.stringify(editorialStyles)};\n`);
    },
  };
}
