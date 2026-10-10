import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadCatalogueRuntime } from './catalogue-runtime';

describe('release-owned catalogue renderer', () => {
  let directory: string;
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'newoteg-catalogue-runtime-')); });
  afterEach(() => {
    if (!resolve(directory).startsWith(resolve(tmpdir()) + '\\newoteg-catalogue-runtime-') &&
        !resolve(directory).startsWith(resolve(tmpdir()) + '/newoteg-catalogue-runtime-')) throw Error('Unexpected test path');
    rmSync(directory, { recursive: true, force: true });
  });
  const packageAt = (dir: string, body: string, extra = {}) => {
    writeFileSync(join(dir, 'renderer.cjs'), body);
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ protocol: 1, file: 'renderer.cjs',
      rendererId: 'a'.repeat(64), bundleSha256: createHash('sha256').update(body).digest('hex'), ...extra }));
  };
  it('loads the owned CJS exports only after verifying their checksum', () => {
    packageAt(directory, 'exports.parseCatalogueRequest = () => ({}); exports.renderCatalogueResponse = () => "HTML";');
    const runtime = loadCatalogueRuntime(directory);
    expect(runtime.rendererId).toBe('a'.repeat(64)); expect(runtime.renderCatalogueResponse('', {}, [], 0)).toBe('HTML');
  });
  it('rejects a modified bundle before executing it', () => {
    packageAt(directory, 'throw Error("should never execute");', { bundleSha256: '0'.repeat(64) });
    expect(() => loadCatalogueRuntime(directory)).toThrow('checksum mismatch');
  });
  it('rejects a path, protocol or missing exports outside the package contract', () => {
    for (const extra of [{ file: '../other.cjs' }, { protocol: 2 }, { rendererId: 'invalid' }]) {
      packageAt(directory, 'throw Error("should never execute");', extra);
      expect(() => loadCatalogueRuntime(directory)).toThrow('Invalid catalogue manifest');
    }
    packageAt(directory, 'exports.other = true;');
    expect(() => loadCatalogueRuntime(directory)).toThrow('renderer exports');
  });
});
