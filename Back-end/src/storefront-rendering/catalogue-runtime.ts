import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export interface CatalogueRuntime {
  rendererId: string;
  parseCatalogueRequest(url: string): { url: string; path: string };
  renderCatalogueResponse(url: string, products: unknown, categories: unknown, at: number): string;
}

// Loads a release-owned package, never code or a path from an HTTP request.
// Missing/invalid packages fail startup only when this optional feature is on.
export function loadCatalogueRuntime(directory: string): CatalogueRuntime {
  const manifestPath = resolve(directory, 'manifest.json');
  if (statSync(manifestPath).size > 1024) throw Error('Invalid catalogue manifest size');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.protocol !== 1 || manifest.file !== 'renderer.cjs' ||
      !/^[a-f0-9]{64}$/.test(manifest.rendererId) || !/^[a-f0-9]{64}$/.test(manifest.bundleSha256))
    throw Error('Invalid catalogue manifest');
  const file = resolve(directory, 'renderer.cjs');
  if (statSync(file).size > 2 * 1024 * 1024) throw Error('Catalogue renderer too large');
  const bytes = readFileSync(file);
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.bundleSha256)
    throw Error('Catalogue renderer checksum mismatch');
  const runtime = createRequire(__filename)(file);
  if (typeof runtime.parseCatalogueRequest !== 'function' || typeof runtime.renderCatalogueResponse !== 'function')
    throw Error('Invalid catalogue renderer exports');
  return { ...runtime, rendererId: manifest.rendererId };
}
