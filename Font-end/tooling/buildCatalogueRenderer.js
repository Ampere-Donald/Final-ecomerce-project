import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

export default function buildCatalogueRenderer() {
  let config;
  return {
    name: 'newoteg-catalogue-renderer', apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      if (!config.build.write || config.env.VITE_CATALOGUE_SSR_BUILD !== 'true') return;
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
      visit('index.html'); visit('src/storefront/Catalogue.jsx');
      await writeFile(resolve(output, 'styles.js'), `export const catalogueStyles = ${JSON.stringify([...styles])};\n`);
    },
  };
}
