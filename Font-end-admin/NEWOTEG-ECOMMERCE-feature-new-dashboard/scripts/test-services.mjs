import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Vitest UI suites require Vite transforms and mocks; keep them out of node:test.
const files = readdirSync('src/services')
  .filter((name) => name.endsWith('.test.ts') && !/\.(ui|e2e)\.test\.ts$/.test(name))
  .sort()
  .map((name) => `src/services/${name}`);
if (!files.length) throw new Error('No service tests found');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
