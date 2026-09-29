import path from 'node:path';
import { defineConfig } from 'vite';
import original from './vite.config';

export default defineConfig(async (context) => {
  const base = typeof original === 'function' ? await original(context) : original;
  const runtime = path.resolve(__dirname, '../../.local-postgres/refonte-e/integrated-admin');
  return {
    ...base,
    envDir: path.join(runtime, 'empty-env'),
    define: {
      ...base.define,
      'process.env.GEMINI_API_KEY': 'undefined',
      'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
    },
    build: { ...base.build, outDir: path.join(runtime, 'site'), emptyOutDir: false },
    preview: {
      host: '127.0.0.1', port: 5189, strictPort: true,
      proxy: { '/api': { target: 'http://127.0.0.1:3017', changeOrigin: true } },
    },
  };
});
