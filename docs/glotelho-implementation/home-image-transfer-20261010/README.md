# Images de l'accueil — 10 octobre 2026

Le design validé, le logo, les textes, les actions, les polyfills et les cibles Android restent conservés. Deux dérivés WebP des assets existants réduisent le téléchargement : aucune génération ou nouvelle composition.

| Asset | Avant | Après |
| --- | ---: | ---: |
| Scène, écrans ≤ 810 px, densité 1 | 48 090 octets, 1440×480 | 23 436 octets, 960×320 |
| Vignette de câble, affichage maximal 64 px | 17 742 octets, 288×192 | 7 918 octets, 192×128 |

Gain exact : 34 478 octets (52,4 %) pour ces deux images sur mobile de densité 1. Aux densités 2 et 3, la scène mobile conserve la variante 1440 px existante. Desktop conserve son srcset 1440/2160. Le préchargement suit le même choix ; sept cas largeur/densité vérifient une seule requête de scène par navigation.

Les dérivés viennent de Sharp : redimensionnement proportionnel, WebP qualité 84/85 et effort 6. Le cadrage et les dimensions CSS ne changent pas. Le conteneur picture est positionné en arrière-plan pour ne pas ajouter une colonne à la grille desktop.

## Vérifications

- Build du storefront réussi avec le même `VITE_API_URL=https://api.newoteg.com` que la publication actuelle.
- 102 tests frontend réussis.
- Sept groupes de rendu initial/hydratation réussis : HTML sans JS, recherche native, saisie/focus conservés, navigation, restauration de session/panier/réception/langue, stockage refusé et échec volontaire du chunk Home.
- Sept cas d'images : 390 px aux densités 1/2/3, 768/1024/1440/1920 px à densité 1. Pas de double téléchargement du hero, débordement ou erreur JS. Texte à gauche et cartes à droite sur desktop vérifiés, captures inspectées.
- Ancien bundle exécuté sous Edge, défilement tactile et absence de débordement/erreur vérifiés. Ce contrôle ne remplace pas un téléphone Android physique.

Les tests locaux interceptent uniquement les GET publics pour éviter les restrictions d'origine du port de preview. Les scénarios d'authentification utilisent des fixtures explicites ; aucune commande, paiement, message ou écriture de production.

## Mesures et limites

Profil : Edge 390×844, cache froid, latence 150 ms, téléchargement 200 000 octets/s, CPU ×4 ; trois échantillons par variante, alternés sur le même adaptateur Worker local avec gzip.

Comparaison finale : ancien LCP 2804 / 2268 / 2268 ms ; nouveau 2436 / 2236 / 2244 ms ; CLS 0 dans les six cas. Médianes 2268 / 2244 ms : **gain de temps trop petit pour conclure**, malgré le gain certain d'octets. La première comparaison donnait même une médiane candidate légèrement supérieure. La publication est justifiée par la réduction de transfert et la conservation du rendu, pas par une prétendue résolution du LCP.

Mesure publique avant changement : accueil 2864 / 2712 / 2652 ms ; catalogue 5116 / 5180 / 4948 ms, CLS 0. L8 reste ouvert. Le diagnostic avec l'entrée JS bloquée n'établit pas que l'hydratation serait la cause dominante ; les polyfills nécessaires sont conservés.

Preuves locales complètes : `C:/Users/pc/Documents/Newoteg/output/implementation-work/home-performance-20261010/` (build, tests, comparison-final, hydration, legacy, images-result.json et captures). Résumés de résultats joints ici. Ces mesures synthétiques locales ne sont ni des mesures publiques après publication, ni des percentiles terrain, ni une mesure INP.

## Publication et vérification publique

PR [#7](https://github.com/Ampere-Donald/Final-ecomerce-project/pull/7) fusionnée sur main `8228f7b9a6b36140b51bc15724fd45bb13865094`. CI complète et deux configurations du contrat catalogue réussies, ainsi que les builds Cloudflare et le déploiement Railway automatique.

À 18:00 UTC, storefront Cloudflare `82c87e04-17d8-4f8c-bdd7-4c7826ae6d7e` à 100 %, administration `9dc98454-4f52-40b1-8aad-78df2ef7e80f` à 100 %. SHA-256 des fichiers modernes/legacy/CSS principaux et des deux nouveaux assets identiques au build local vérifié. Les sept cas largeur/densité passent sur le domaine public ; les requêtes analytiques sont bloquées dans la recette. Les réponses API y sont isolées pour vérifier les images et la disposition, sans prétendre tester une commande réelle.

Mesure publique après publication, même profil : LCP 2796 / 2540 / 2336 ms ; CLS 0, pas d'erreur JS ni écriture. Médiane 2540 ms contre 2712 ms avant ; seulement trois échantillons par série et non alternés sur le domaine, donc tendance, pas preuve d'un gain terrain. Deux passages dépassent toujours 2500 ms : **L8 reste ouvert**.

API/base/stockage sains ; rendu catalogue toujours désactivé (503), email/SMS invités absents, collecteur arrêté, zéro projet publié. Les résultats publics ajoutés à ce dossier sont le relevé local post-publication ; ils ne modifient aucune configuration.

Reste : hébergement isolé Railway et validation du rendu catalogue complet, performances publiques, téléphone réel et gates métier de l'objectif A–Z.
