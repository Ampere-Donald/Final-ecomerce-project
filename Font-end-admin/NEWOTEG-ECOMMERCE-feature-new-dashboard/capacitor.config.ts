import type { CapacitorConfig } from '@capacitor/cli';

// Coquille native minimale : la WebView charge directement l'URL de production
// de l'admin. Le contenu (React) reste servi et mis à jour par le Worker
// Cloudflare comme pour la PWA — cet APK n'embarque pas le build, il ne fait
// que pointer vers le site. Cela évite d'avoir à republier un APK à chaque
// déploiement.
const PRODUCTION_URL = 'https://admin.newoteg.com';

const config: CapacitorConfig = {
  appId: 'com.newoteg.admin',
  appName: 'Newoteg Admin',
  webDir: 'dist',
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
  },
  android: {
    // Version minimale du WebView Chromium (pas la version d'Android OS) ;
    // 60 est le minimum par défaut de Capacitor, compatible avec un WebView
    // mis à jour via le Play Store même sur un appareil Android 5/6.
    minWebViewVersion: 60,
  },
};

export default config;
