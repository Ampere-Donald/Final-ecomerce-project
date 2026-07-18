import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      // Génère des bundles transpilés + polyfills pour les anciens
      // navigateurs Android (parc boutique jusqu'à Android 5/6, Chrome mis à jour via Play Store)
      legacy({
        targets: ['defaults', 'chrome >= 64', 'android >= 5'],
        modernPolyfills: true,
      }),
      // PWA installable (icône écran d'accueil, plein écran, cache de consultation
      // hors-ligne en lecture seule). Doit rester APRÈS legacy() dans cet ordre.
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
        manifest: {
          name: 'Newoteg Admin',
          short_name: 'Newoteg',
          description: 'Administration boutique et e-commerce Newoteg',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#1c19a3',
          background_color: '#f6f6f8',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Le HTML/JS/CSS buildés sont précachés (network falling back to cache).
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          globIgnores: [
            'assets/{Analyses,POSVendeur,jspdf.es.min,jspdf.plugin.autotable,html2canvas.esm,html2canvas-pro.esm,jszip.min,qzPrinter,Paie,Achats,Produits}-*.js',
            'assets/{Analyses,POSVendeur,jspdf.es.min,jspdf.plugin.autotable,html2canvas.esm,html2canvas-pro.esm,jszip.min,qzPrinter,Paie,Achats,Produits}-legacy-*.js',
          ],
          // Le bundle principal (legacy inclus) dépasse la limite par défaut de 2 MiB.
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
          runtimeCaching: [
            {
              urlPattern: ({url, request}) =>
                request.destination === 'script' &&
                /^\/assets\/(Analyses|POSVendeur|jspdf|html2canvas|jszip|qzPrinter|Paie|Achats|Produits)-/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'newoteg-on-demand-modules-v2',
                expiration: {maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60},
                cacheableResponse: {statuses: [200]},
              },
            },
            {
              // Consultation hors-ligne en lecture seule (catalogue, prix, clients, taux).
              // Jamais les endpoints d'écriture, jamais /uploads (images lourdes).
              urlPattern: ({url, request}) =>
                request.method === 'GET' &&
                /^\/api\/(produits|categories|clients|taux-change)(\/|$)/.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'newoteg-offline-data-v1',
                expiration: {maxEntries: 50, maxAgeSeconds: 30 * 60},
                cacheableResponse: {statuses: [200]},
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Proxy setting for the backend API
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
