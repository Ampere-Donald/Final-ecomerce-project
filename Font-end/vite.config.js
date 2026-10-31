import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import prerenderHome from './tooling/prerenderHome.js'
import buildCatalogueRenderer from './tooling/buildCatalogueRenderer.js'
import prefetchCatalogue from './tooling/prefetchCatalogue.js'
import { applyHostedProductionDefaults } from './tooling/hostedProduction.js'
import { verifyEditorial } from './tooling/prepareEditorial.mjs'
import { verifyEnglishRoutes } from './tooling/prepareEnglishRoutes.mjs'

applyHostedProductionDefaults()
await verifyEditorial()
await verifyEnglishRoutes()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Génère des bundles transpilés + polyfills pour les anciens
    // navigateurs Android (WebView/Chrome < 107)
    legacy({
      targets: ['defaults', 'chrome >= 64', 'android >= 7'],
      modernPolyfills: true,
    }),
    prerenderHome(),
    buildCatalogueRenderer(),
    prefetchCatalogue(),
  ],
  build: { manifest: true },
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      // Same-origin API and relative catalogue images use the same local backend.
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
