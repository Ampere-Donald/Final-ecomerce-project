# Plan d'action — Application mobile Newoteg Admin (téléphones & tablettes, vieux Android)

Date : 11 juillet 2026
Objectif : permettre aux employés (vendeurs, caissiers, admins) d'utiliser Newoteg Admin
sur téléphone/tablette, y compris sur d'anciens modèles Android, avec une expérience
simple : une icône sur l'écran d'accueil, on tape son PIN, on travaille.

---

## 1. Constat (ce qu'on a déjà — et c'est beaucoup)

| Acquis | Détail |
|---|---|
| Web-app déjà en ligne | Admin React + Vite + Tailwind 3, servie par le Worker Cloudflare `newoteg-admin`, API proxifiée vers Railway |
| Compatibilité vieux Android déjà faite | `@vitejs/plugin-legacy` cible `android >= 7` / `chrome >= 64`, Tailwind 3 (pas de CSS moderne cassant) |
| Login adapté boutique | Connexion par **PIN** pour VENDEUR/CAISSIER déjà en place |
| Début de responsive | Layout avec sidebar-tiroir mobile + overlay ; ~40 écrans avec classes `md:`/`lg:` |
| Scanner déjà installé | `@zxing/browser` est déjà dans les dépendances → scan code-barres par caméra possible |

Conclusion du brainstorm : **il ne faut PAS réécrire une app native (React Native/Flutter)**.
Ce serait des mois de travail et une double maintenance. La bonne stratégie est de
transformer l'admin existant en application installable.

## 2. Options étudiées

| Option | Verdict | Pourquoi |
|---|---|---|
| **A. PWA installable** (manifest + service worker) | ✅ **Phase 1** | Icône sur l'écran d'accueil, plein écran, mises à jour automatiques à chaque déploiement, zéro Play Store. Fonctionne dès Chrome 64. Effort : faible. |
| **B. APK Capacitor** (coquille native autour de l'URL prod) | ✅ **Phase 3** | Pour les appareils sans Chrome ou où l'installation PWA est peu fiable. APK à partager par WhatsApp/USB (pas de Play Store). En mode « remote URL », l'app se met à jour toute seule. Min. Android 5.1. |
| C. React Native / Flutter | ❌ Rejeté | Réécriture complète de ~40 écrans, double maintenance, aucun gain pour ce besoin. |

## 3. Plan d'action par phases

### Phase 1 — Transformer l'admin en PWA installable (le cœur)
0. Élargir les cibles legacy dans `vite.config.ts` (`android >= 5`, `chrome >= 55`) pour couvrir les WebView Android 5/6 non à jour, et vérifier que le build passe.
1. `manifest.webmanifest` : nom « Newoteg Admin », icônes 192/512 px (à partir de `logo.png`), `display: standalone`, orientation libre (téléphone ET tablette), couleur de thème.
2. Service worker **prudent** : stratégie *network-first* pour le HTML et l'API (jamais de vieilles données périmées si le réseau est là), cache des assets statiques versionnés, et **cache de consultation hors-ligne** (lecture seule) pour les GET catalogue/produits avec bandeau « Mode hors-ligne ».
3. Bouton « 📲 Installer l'application » dans l'écran de connexion + menu profil (événement `beforeinstallprompt`), avec instructions manuelles pour les vieux Chrome (« Menu ⋮ → Ajouter à l'écran d'accueil »).
4. Méta viewport/theme-color, splash screen, désactiver le zoom accidentel sur les champs.

### Phase 2 — UX mobile par rôle (« faciliter la tâche aux employés »)
Audit écran par écran sur viewport 360×640 (le format des vieux téléphones), en priorisant par rôle :
1. **VENDEUR** : POS vendeur en plein écran, gros boutons tactiles (≥ 44 px), recherche produit + **scan code-barres par caméra** (zxing déjà là), panier accessible au pouce.
2. **CAISSIER** : file caissier + caisse du jour, gros pavé numérique pour encaissement.
3. **ADMIN / SUPER_ADMIN** : dashboard, produits, ventes, clients — les grands tableaux deviennent des **cartes empilées** sur mobile (pattern déjà utilisable partout).
4. Navigation : sidebar-tiroir conservée + éventuellement barre d'onglets en bas (3-4 raccourcis selon le rôle).
5. Perf vieux appareils : alléger le dashboard (recharts est lourd) — graphiques chargés en lazy, listes paginées.

### Phase 3 — APK Capacitor (filet de sécurité)
1. Projet Capacitor minimal (`minSdkVersion 22` = Android 5.1) dont la WebView charge l'URL de prod → les mises à jour restent automatiques, l'APK n'est régénéré presque jamais.
2. Génération d'un APK signé, distribué par WhatsApp/USB avec un petit guide d'installation (« Autoriser les sources inconnues »).
3. Test du WebView système sur les appareils réels (sur Android 5-6 il peut être vieux ; s'il est trop vieux, le bundle legacy déjà en place couvre Chrome/WebView ≥ 64).

### Phase 4 — Tests réels & déploiement boutique
1. Tests sur les téléphones/tablettes réels des employés (liste à me donner).
2. Section « Installer sur téléphone » ajoutée au Guide utilisateur (`UserGuide.tsx`) avec captures.
3. Vérification finale : login PIN, une vente complète au POS, une clôture de caisse, tout depuis un téléphone.

## 4. Risques identifiés
- **Service worker mal configuré = vieilles versions coincées en cache.** Parade : network-first sur le HTML + versioning des caches + bouton « Vérifier les mises à jour ».
- **WebView obsolète sur Android 5-6 jamais mis à jour.** Parade : bundle legacy déjà en place ; test réel en Phase 4 ; l'APK Capacitor peut embarquer les instructions de mise à jour du WebView.
- **Mémoire faible des vieux appareils.** Parade : lazy-loading des écrans lourds, images produits compressées.
- **Caméra pour le scan** nécessite HTTPS (déjà le cas via Cloudflare) et la permission caméra.

## 5. Décisions validées (réponses du 11 juillet 2026)
1. **Appareils les plus vieux : Android 5 ou 6.** Conséquences :
   - Élargir les cibles du bundle legacy (`vite.config.ts`) pour couvrir les WebView/Chrome plus anciens.
   - Étape obligatoire sur chaque appareil : **mettre à jour Chrome et Android System WebView via le Play Store** (dernière version possible sur Android 5/6 : Chrome/WebView 106 — largement suffisant pour la PWA).
   - La Phase 3 (APK Capacitor) est confirmée comme indispensable ; attention : Capacitor récent exige Android 5.1+ — si un appareil est en 5.0, la PWA via Chrome sera sa seule voie.
2. **Chrome + Play Store présents, mais PAS de publication sur le Play Store.** Distribution retenue : installation PWA depuis Chrome (voie principale) + APK partagé par WhatsApp/USB (voie secours).
3. **Tous les rôles utiliseront le mobile**, avec priorité de réalisation : VENDEUR → CAISSIER → ADMIN/SUPER_ADMIN → le reste.
4. **Offline : consultation seule.** Le service worker gardera en cache lecture seule les dernières données consultées (catalogue produits, prix, stock affiché) avec un bandeau « Mode hors-ligne — données du [heure] ». **Aucune vente/écriture hors-ligne** (pas de synchronisation différée).
5. Scan code-barres caméra : prévu en Phase 2 pour le POS vendeur.
