# APK Newoteg Admin (coquille Capacitor) — build différé

Ce dossier contient un projet **Capacitor** déjà scaffoldé (`android/`) qui sert de
coquille native : la WebView charge directement `PRODUCTION_URL` défini dans
`capacitor.config.ts`. L'APK ne contient donc pas le code de l'application — les
mises à jour restent automatiques, exactement comme pour la PWA (Phase 1).

## ⚠️ Un point à vérifier avant de construire l'APK

**Couverture Android réelle de cet APK : Android 7.0 (API 24) et plus.**
   Capacitor 8 fixe `minSdkVersion = 24` par défaut (`android/variables.gradle`)
   et ses bibliothèques (androidx) ne garantissent pas un fonctionnement fiable
   en dessous. **Ne descendez pas ce chiffre sans test réel sur un appareil
   Android 5/6** — un plantage silencieux au démarrage serait pire qu'une
   absence d'APK.
   → **Pour les appareils Android 5/6 de la boutique, la voie fiable reste la
   PWA installée depuis Chrome (Phase 1)**, dont la compatibilité descend
   volontairement plus bas (`vite.config.ts` : `android >= 5`). Cet APK est un
   filet de secours pour les appareils Android 7+ sans Play Store activé, pas
   un remplacement universel.

## Pourquoi aucun `.apk` n'est fourni ici

Cette machine ne dispose ni de JDK, ni d'Android SDK, ni de Gradle
(`JAVA_HOME`/`ANDROID_HOME` vides). Le scaffold (`npx cap add android`) ne
nécessite pas ces outils, mais la compilation/signature de l'APK en a besoin.

## Marche à suivre (sur une machine avec Android Studio installé)

1. Installer **Android Studio** (inclut JDK 17 et l'Android SDK).
2. Cloner/copier ce dossier `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard`.
3. `npm install`
4. `npm run build` (régénère `dist/`, utilisé uniquement comme copie de secours
   par Capacitor — le contenu réellement affiché vient de `server.url`,
   déjà réglé sur `https://admin.newoteg.com`).
5. `npx cap sync android` (synchronise les assets et plugins natifs).
6. Ouvrir `android/` dans Android Studio :
   - **Build → Generate Signed Bundle / APK** pour un APK signé, distribuable
     par WhatsApp/USB (garder le fichier de clé de signature en lieu sûr —
     nécessaire pour toute future mise à jour de l'app elle-même, rare
     puisque le contenu se met à jour via le site).
   - Ou en ligne de commande : `cd android && ./gradlew assembleRelease`
     (nécessite un `keystore` configuré dans `android/app/build.gradle`).

## Distribution aux employés

1. Partager le fichier `.apk` par WhatsApp ou clé USB (pas de Play Store).
2. Sur le téléphone : **Paramètres → Sécurité → Autoriser l'installation
   depuis des sources inconnues** (le libellé exact varie selon Android/marque).
3. Ouvrir le fichier `.apk` reçu pour l'installer.
4. Se connecter avec les identifiants habituels (PIN pour vendeur/caissier,
   mot de passe pour admin).

## Icônes

Les icônes de l'app (`public/icons/icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, générées par `scripts/generate-pwa-icons.mjs`) peuvent
être reprises pour l'icône native via `@capacitor/assets` :
```
npx @capacitor/assets generate --android --iconBackgroundColor "#1c19a3" --iconBackgroundColorDark "#1c19a3"
```
(commande à lancer sur la machine avec Android Studio, après avoir placé un
logo source carré dans `assets/icon.png` — voir la doc `@capacitor/assets`).
