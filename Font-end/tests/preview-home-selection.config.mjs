import { defineConfig } from 'vite';
import base from '../vite.config.js';
// Local read-only browser recipe using the production build and public API.
export default defineConfig({
  ...base,
  preview: {
    host: '127.0.0.1', port: 5199, strictPort: true,
    proxy: { '/api': { target: 'https://api.newoteg.com', changeOrigin: true } },
  },
});
