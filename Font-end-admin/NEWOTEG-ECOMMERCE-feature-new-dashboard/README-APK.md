# Installer et mettre à jour Newoteg sur Android

## Installation proposée sur le site

Le bouton **Installer l’application sur cet appareil** utilise l’installation web
de Chrome (`beforeinstallprompt`). Il installe une PWA, avec une icône Android.
Il ne distribue pas un fichier APK Capacitor à télécharger. La PWA partage le
service worker et les fichiers d’affichage du profil Chrome qui l’a installée.

## Ancienne interface ou connexion AUTH_NETWORK

1. Enregistrer les saisies ouvertes, puis fermer les autres onglets Newoteg.
2. Dans Chrome, ouvrir `https://admin.newoteg.com/api/app-update`.
3. Choisir **Charger la nouvelle version**, puis rouvrir l’icône de l’application.

Cette page ne dépend pas du bundle React ni du cache de navigation hérité. Elle
vérifie le serveur avant de désinscrire le service worker de la racine et de
supprimer uniquement les caches de fichiers d’affichage Newoteg. Elle ne touche
ni aux sessions, ni à localStorage, ni à IndexedDB (ventes en attente et paniers).
Elle ne remplace pas le mot de passe ou le PIN.

Le nouveau service worker active une seule fois la migration des anciennes
installations sans recharger leurs pages ouvertes ni effacer leurs fichiers.
Une nouvelle navigation charge la nouvelle interface. Les mises à jour suivantes
conservent le bouton de confirmation, pour enregistrer les saisies en cours.

La connexion et les flux temps réel passent par `/api` sur le domaine admin,
même si une ancienne variable de compilation indique directement le backend.
Les images `/uploads` utilisent également le relais HTTPS du domaine admin.

## APK Capacitor distinct

Le projet `android/` permet aussi de compiler une application native distincte.
Sa configuration actuelle charge `https://admin.newoteg.com` dans une WebView.
Le projet utilise Capacitor 7, `minSdkVersion = 23` et un WebView minimal de 60.
Ces réglages ne constituent pas une validation sur chaque appareil Huawei/Pixel.

La CI compile un **APK de test**, disponible dans l’artefact
`newoteg-admin-debug-apk`. Cet artefact n’est pas le bouton d’installation du site.

Pour compiler :

```sh
npm ci
npm run build
npx cap sync android
./android/gradlew -p android assembleDebug
```

Une publication native exige une clé de signature conservée et un numéro de
version croissant. Vérifier le certificat d’un APK déjà distribué avant de
préparer sa mise à jour. Ne pas demander la désinstallation ou l’effacement des
données pour corriger l’affichage : cela peut supprimer des ventes hors ligne.
