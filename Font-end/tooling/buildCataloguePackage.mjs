import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildCataloguePackage } from './cataloguePackage.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output')) throw Error('Usage: node tooling/buildCataloguePackage.mjs [--output directory]');
const outDir = resolve(root, args[1] || '../Back-end/.storefront-renderer');
// Preserve public storefront configuration, with same-origin API as the
// deployment default. Existing explicit VITE_API_URL still takes precedence.
const env = { VITE_API_URL: '/api', ...loadEnv('production', root, 'VITE_') };
await buildCataloguePackage(root, env, outDir);
