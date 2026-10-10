import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { initialHomeStyles } from '../src/storefront/initialHome.js';

export default function prerenderHome() {
  let config;
  return {
    name: 'newoteg-public-home-html',
    apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      if (!config.build.write || config.env.VITE_INITIAL_HOME === 'false') return;
      const output = resolve(config.root, config.build.outDir);
      const manifest = JSON.parse(await readFile(resolve(output, '.vite/manifest.json'), 'utf8'));
      // Compile the existing components for this build-time render only. No
      // application server, database or worker runtime dependency is introduced.
      const server = await createServer({
        configFile: false, root: config.root, plugins: [react()],
        server: { middlewareMode: true }, appType: 'custom',
        define: Object.fromEntries(Object.entries(config.env)
          .filter(([key]) => key.startsWith('VITE_'))
          .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
      });
      try {
        const { renderHome } = await server.ssrLoadModule('/src/storefront/serverHome.jsx');
        const snapshot = { version: 1, language: 'fr', html: renderHome(), css: initialHomeStyles(manifest) };
        await writeFile(resolve(output, '__public-home.json'), JSON.stringify(snapshot), 'utf8');
        config.logger.info('Generated anonymous public home HTML from shared components');
      } finally { await server.close(); }
    },
  };
}
