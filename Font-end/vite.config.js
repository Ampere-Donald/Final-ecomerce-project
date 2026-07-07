import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

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
  ],
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      // Toutes les requêtes commençant par /api sont redirigées vers le backend NestJS
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
