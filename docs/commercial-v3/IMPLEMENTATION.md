# NEWOTEG V3 — refonte commerciale

## Périmètre et état

Départ : branche `codex/newoteg-evolution`, commit `622b066f` ; fichiers préexistants non suivis `Back-end/test/sandbox/` et `docs/refonte-e/` conservés. Mission : document utilisateur `22217b96-fac1-41f8-bbbf-cbd45bd7c060/pasted-text-1.txt`, 16 sections. Livraison frontend uniquement. Aucun prix, promotion, stock, commande réelle ou catégorie administrative à modifier.

Statut : V3 publiée et vérifiée sur https://newoteg.com le 08/10/2026. La précédente livraison de cinq cartes ne constitue pas cette V3.

## Audit avant refonte

Audit public en lecture seule, captures dans `C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/before/`.

- Accueil : cinq produits, puis projets/offres/arrivages ; les trois derniers sont vides actuellement. Diversité de l'inventaire peu visible.
- Recherche : formulaire opérationnel vers le catalogue. Aucune suggestion dynamique n'existe actuellement. Le header validé est conservé dans cette mission.
- Navigation : liens directs desktop et tiroir mobile (15 liens). Aucun méga-menu desktop à auditer dans le code actuel.
- Catalogue : 1 883 références au moment de l'audit ; 24 par page, filtres famille/stock/prix, tri et pagination. Vue mobile précédente en grandes cartes horizontales.
- Fiche testée : TDA 2148, référence 118057 ; caractéristiques, quantité, stock, tarif gros et ajout panier présents. Les recommandations sont de la même famille.
- Fiche sans prix : Condensateur ajustable métallique pour radio, référence 104067 ; prix absent et achat impossible. Un visuel renseigné dans l'API peut échouer et déclencher le fallback, ce qui est conservé.
- Rupture : `stockState` empêche l'achat ; accès existant aux équivalences avec `query` et `produitId`. Préremplissage vérifié dans la recette finale.
- Favoris : sauvegarde via FavoritesContext, page privée sous authentification. Comparaison : route réelle `/comparer`, trois articles d'une même famille. La tentative initiale `/comparaison` était une erreur de l'audit, pas une route attendue du site.
- Arrivages et offres : endpoints existants, aucune ligne publiée actuellement. Aucun remplacement artificiel par des promotions.
- Projets : aucune liste publiée actuellement ; accès à la bibliothèque conservé.
- Panier/checkout : vérifiés par API interceptée en local, sans commande de production.

## Inspirations et composition

Source consultée le 08/10/2026 : https://glotelho.cm/ — accès par familles, collections et liens vers davantage de produits, bannières et réassurance. La récupération HTML ne suffit pas à vérifier la totalité de leur contenu dynamique. Aucun asset ou texte de campagne Glotelho repris.

Référence de carte disponible : screenshot fourni `codex-clipboard-b5730c24-b8a2-434e-88e0-48a165e26a46.png`. Le document V3 évoque une seconde inspiration, mais aucun fichier supplémentaire ne se trouve dans son dossier d'attachement. Composition fondée sur cette référence et le cadrage écrit.

Palette conservée : action #0862c7, encre #172d41, blanc #ffffff, filet #e7edf2, accent #087b84, sélection #e3f5eb. Typographie existante conservée. Hero et navbar restent les points visuels dominants ; les rayons sont sobres et alignés. Deux bannières maximum, textes/CTA HTML et visuels génériques existants, sans photographie fictive d'un article précis.

Ordre : hero et raccourcis existants → équivalences → sélection éditoriale → bannière composants → condensateurs → circuits/transistors → réparation TV/audio → alimentation/chargeurs/batteries → connectique → bannière atelier → mesure/outillage → arrivages/offres conditionnels → projets → réassurance et blocs existants.

## Architecture et règles de données

- `ProductPrimitives` : photo responsive/lazy/fallback, prix et textes bilingues.
- `ProductCard` : carte partagée ; alias `Card` conservé dans Elements et wrapper historique HomeProductCard. Comparaison autorisée dans le catalogue et sur les fiches, absente des rayons de l'accueil. CTA détail, rupture vers équivalences. L'achat reste sur la fiche avec canBuy et contrôles existants.
- `ProductCarousel` : cinq cartes desktop, trois tablette, 82 % d'une largeur utile mobile ; flèches, limites, clavier, scroll-snap, mouvement réduit et aucune lecture automatique.
- `merchandisingData` : six configurations FR/EN, catégories réelles résolues à partir de `/categories`, recherches ciblées, ordre et limite 20.
- Échantillons bornés à 20 par requête et 20 affichés par rayon ; aucun téléchargement de l'inventaire complet. Sources entrelacées, priorité photo/prix public/stock vendable, ordre stable et dédoublonnage par ID.
- `publicCollectionCache` : uniquement données publiques de collections, TTL 30 s, maximum 50 entrées, deux requêtes simultanées et timeout 30 s pour tolérer les connexions lentes. Aucun cache du checkout ou de données privées.
- Montage progressif via IntersectionObserver ; les rayons éloignés ne lancent aucune requête initiale.
- Arrivages : réception validée serveur. Offres : validation serveur et expiration locale. Prix catalogue identifié comme tarif hors offre, jamais garanti comme ancien prix historiquement pratiqué. À l'expiration d'une offre en mémoire, sa carte cesse d'annoncer le montant temporaire et affiche « Prix à confirmer » jusqu'à la lecture d'une fiche actualisée ; aucun tarif catalogue n'est substitué automatiquement.
- Aucun visuel fictif nouvellement généré. Deux compositions de bannières avec les illustrations génériques déjà présentes, plus quatre dérivés WebP (144 px / 240 px), srcset, dimensions, décodage asynchrone et chargement différé.
- Cartes allégées : tarifs par quantité conservés intégralement sur les fiches, sans répéter ce texte dans les cartes. Aucun espace publicitaire vide quand une carte n'a pas de promotion.

## Données à compléter

Échantillon borné : jusqu'à 24 produits par catégorie, tri prix décroissant, stock positif. Liste de 77 fiches à examiner : [fiches-a-completer.csv](fiches-a-completer.csv). Cette liste n'est pas un audit exhaustif des 1 883 références. Aucun correctif automatique des données. Contrôle complémentaire borné : six résultats TDA disponibles dont un seul tarif public renseigné ; 38 résultats « transistor » dans la recherche, aucun prix public dans les 20 premiers contrôlés. Le rayon ne cache pas cette limite et affiche « Prix à confirmer ».

## Mesures avant

Outil existant `measure-built-mobile.cjs`, production GET uniquement, trois échantillons par route, 390 px, réseau 200 ko/s + 150 ms et CPU x4. Accueil LCP 5 284 / 4 516 / 4 856 ms ; catalogue 5 340 / 21 676 / 25 688 ms. CLS 0 sur six échantillons. JS encodé environ 206 ko accueil / 199 ko catalogue. Budget LCP 2,5 s déjà dépassé avant la refonte. Conditions synthétiques, pas des Core Web Vitals terrain ; variabilité CDN/API forte à documenter dans la comparaison après.

## Intégration et recette locale

La mise à jour de navigation publiée pendant le chantier a été intégrée par rebase sur `bbcbe0c7` : header, méga-menu et suggestions réelles sont conservés. L'audit initial ci-dessus décrit leur absence **avant** cette livraison concurrente ; ce constat n'est plus l'état final.

Résultats vérifiés :

- `npm test` : 92 tests réussis, dont configuration des rayons, limites, diversité, priorisation et absence de prix inventé.
- `npm run lint` : réussi.
- `npm run build -- --outDir dist-release` : réussi, bundles modernes et legacy.
- `verify-commercial-v3.cjs` : API intégralement interceptée localement ; navigation des carrousels, six tailles, filtres, favoris persistants, comparaison, recherche/suggestions/méga-menu, prix inconnu, rupture/équivalences, offres actives/expirées, arrivages, erreurs/retry/partiel/vide, FR/EN, fiche/panier/vérification du checkout. Seul POST intercepté : `/commandes/quote`. Aucun enregistrement de commande.
- `verify-commercial-v3-live.cjs` : 19 contrôles sur le build local et les données publiques réelles, aucun écrit ni erreur JS. Rayons constatés : condensateurs 20 ; circuits/transistors 14 ; réparation 7 ; alimentation 20 ; connectique 20 ; outils 16. Sélection éditoriale : 6. Limite de 20 par collection ; les références peuvent apparaître dans plusieurs contextes pertinents.
- `verify-commercial-v3-legacy.cjs` : bundle legacy exécuté, glissement tactile du carrousel, absence de débordement et d'erreur JS. Edge moderne avec viewport/tactile mobile, **pas** un appareil Android physique.
- Captures 360, 390, 768, 1024, 1440 et 1920 px dans `C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/after/`. Les neuf vues demandées ont été ouvertes et inspectées : accueil complet desktop/mobile, sélection, condensateurs, bannière, carrousel défilé, catalogue desktop/mobile, fiche. Corrections issues de cette inspection : spécificité CSS mobile, densité des cartes, priorisation des prix et position des captures sous le header fixe.

Des essais locaux ont rencontré des délais réseau intermittents ; leurs traces `failure.json` sont conservées. La recette complète a ensuite réussi. Le parcours d'erreur et le retry restent disponibles.

Mesure de référence supplémentaire avec le header intégré : `before-performance-header/mobile-lab-result.json`, même profil, trois échantillons. Accueil LCP 7 744 / 9 816 / 13 492 ms ; catalogue 16 748 / 9 824 / 7 460 ms ; CLS 0 ; JS ~205 ko / 199 ko. La dispersion est importante ; comparer les médianes avec prudence. Le budget absolu de 2,5 s n'est pas atteint avant V3.

## Publication et mesures après

Code livré : `f3f3f71c54269037a97029e2ec8de968a5c1c34b`, précédé du commit d'implémentation `b787b2ee`, tous deux poussés sur `origin/main` sans force. Build final : 1 922 modules, bundles modernes et legacy, 32,10 s. Seul le frontend a été publié via le Worker Cloudflare existant `newoteg-client`, avec `--keep-vars`, sans modification du backend.

Version Cloudflare : `dcaf9e21-5442-4fe5-9002-fb285ca7f4b1`. La page publique charge bien le point d'entrée du build livré `assets/index-CQfDUQf1.js`. `verify-commercial-v3-live.cjs` a ensuite réussi ses **19 contrôles sur https://newoteg.com**, avec `errors: []` et `writes: []`. Les captures publiques sélection desktop, catalogue mobile et accueil mobile complet ont également été ouvertes et inspectées.

Capacité constatée : sélection éditoriale 6, condensateurs 20, circuits/transistors 14, réparations 7, alimentation 20, connectique 20, outils 16 ; soit **103 emplacements de produits** parmi sept carrousels, pas 103 références distinctes garanties. Cinq cartes visibles sur desktop ; maximum 20 références par collection. Aucun arrivage ni offre publiés au contrôle : blocs masqués. Aucun projet publié : lien neutre vers la bibliothèque conservé.

Comparaison synthétique comparable avec le header déjà intégré, trois passages par route, cache froid, viewport 390 × 844, CPU ×4, 200 000 octets/s et latence 150 ms :

| Route | LCP médian avant | LCP médian après | JS encodé médian avant/après | CLS après |
| --- | ---: | ---: | ---: | ---: |
| Accueil | 9 816 ms | 5 912 ms | 205 409 / 209 345 octets | 0 |
| Catalogue | 9 824 ms | 5 488 ms | 199 193 / 201 308 octets | 0 |

Après : accueil 9 784 / 5 912 / 5 580 ms ; catalogue 5 488 / 4 916 / 5 780 ms. Aucun débordement, erreur JS ou écriture. Le budget JS de 220 Kio et le budget CLS de 0,1 passent. **Le budget LCP de 2,5 s reste dépassé**, comme avant ; résultat de l'outil `budgets-missed`. Les médianes ne montrent pas de régression sur ces passages, mais la dispersion réseau/CDN interdit d'attribuer toute l'amélioration à V3. Ces mesures ne prouvent ni les Core Web Vitals terrain, ni l'INP, ni la performance sur un appareil Android physique. L'amélioration du chargement initial reste un travail ultérieur identifié.

Preuves locales, racine `C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/` :

- `before/` : état et captures avant.
- `fixture/result.json` : 12 groupes de scénarios locaux, API interceptée, parcours d'achat sans commande réelle.
- `legacy/result.json` : exécution du bundle legacy et glissement tactile dans Edge.
- `after/result.json` : 19 contrôles du build local avec catalogue réel ; neuf vues obligatoires inspectées.
- `production/result.json` : 19 contrôles publics ; captures aux six largeurs.
- `before-performance-header/mobile-lab-result.json` et `after-performance/mobile-lab-result.json` : mesures comparables détaillées, limites et budgets.

## Audit final des 16 sections du brief

| Exigence | Preuve / état |
| --- | --- |
| 1. Audit et simulation | Audit initial, captures avant, recette interceptée jusqu'à la vérification ; principes Glotelho observés. Seconde référence distincte non jointe : limite signalée. |
| 2. Réutilisation | ProductCard partagé, alias Card, primitives uniques ; catalogue/recherche/apparentés/commercial utilisent cette carte. |
| 3. Accueil commercial | Sept carrousels actuels, deux bannières, arrivages/offres conditionnels, projets et réassurance ; début d'accueil conservé. |
| 4. Carrousels | Cinq desktop, trois tablette, ~1,2 mobile, flèches/limites, tactile/clavier/mouvement réduit ; pas d'autoplay. |
| 5. Configuration | Six configurations FR/EN, IDs API, recherches bornées, liens de famille et sous-familles ; aucune catégorie déplacée. |
| 6. Cartes | Images réelles, favoris, stock/prix honnêtes, CTA détail ou équivalences ; promotions serveur seulement ; comparaison hors rayons. |
| 7. Catalogue | Grille compacte, deux colonnes mobile, liste facultative ; filtres, tri, recherche, pagination et comparaison testés. |
| 8. Bannières | Deux compositions avec assets existants, textes HTML, WebP responsive/lazy ; logo conservé. |
| 9. Sélection | Actifs, stock positif, priorité photo/prix, dédoublonnage et diversité ; aucune donnée commerciale éditée. |
| 10. Parcours | Accueil/recherche/fiche/panier/review testés ; documentation, caractéristiques, gros, achat et contrôles conservés. Libellé « Demander le prix » si tarif absent. |
| 11. Identité | Hero/logo/navbar intégrée/dégradé/équivalences/Akwa préservés. |
| 12. Performance/accessibilité | Progressif, deux requêtes de collections, cache public borné, images différées, clavier/tactile/legacy ; mesures avant/après acquises, aucune régression médiane constatée. Budget LCP absolu toujours dépassé, explicitement signalé. |
| 13. Données | CSV de 77 fiches à compléter ; échantillon déclaré, aucune correction en base. |
| 14. Recette | Tests et captures ci-dessus ; neuf vues inspectées. Aucun appareil Android physique disponible. |
| 15. Déploiement | Code poussé sur main, frontend Cloudflare publié, empreinte du build et 19 contrôles publics vérifiés ; aucune écriture métier. |
| 16. Livrables | Code, CSV, captures avant/après, tests, comparaison de performance, version publiée et présent rapport. |

## Limites et retour arrière

- Aucun blocage de livraison restant. Les prix/images à compléter, le LCP initial, l'absence de seconde référence distincte et l'absence d'Android physique sont les limites explicites ci-dessus.
- Les contrôles frontend exécutés localement sont attestés ; aucune affirmation de réussite de l'ensemble du workflow GitHub (backend/admin/Android) n'est faite.

Retour arrière : utiliser la version Cloudflare précédente après identification via `wrangler deployments list`, sans changer de plateforme ni réinitialiser la base. Une version n'est déclarée publiée qu'après contrôle public effectif.

Version précédente constatée avant publication : `f34fa28e-4fa9-4466-825a-cc7ddf9e7887`. Retour arrière si nécessaire : `node node_modules/wrangler/bin/wrangler.js rollback f34fa28e-4fa9-4466-825a-cc7ddf9e7887 --message "Rollback commercial V3"` depuis Font-end, puis contrôle public. Aucun retour arrière de données à effectuer.

## Fichiers de cette livraison

- `Font-end/src/storefront/` : `Home.jsx`, `HomeSelection.jsx`, `HomeProductCard.jsx`, `HomeMerchandising.jsx`, `Elements.jsx`, `ProductPrimitives.jsx`, `ProductCard.jsx`, `ProductCarousel.jsx`, `Product.jsx`, `Commercial.jsx`, `homeSelectionData.js`, `merchandisingData.js`, `publicCollectionCache.js`, `useOfferClock.js`, `merchandising.css`, `product-card.css`.
- `Font-end/tests/` : `homeSelection.test.mjs`, `merchandising.test.mjs`, `verify-commercial-v3.cjs`, `verify-commercial-v3-live.cjs`, `verify-commercial-v3-legacy.cjs`, `verify-home-selection.cjs`, `verify-home-selection-live.cjs` (anciens points d'entrée redirigés vers la recette V3).
- `Font-end/public/design-e/` : `category-v2-components-144.webp`, `category-v2-power-144.webp`, `category-v2-tools-144.webp`, `equivalence-parts-v2-240.webp`.
- `docs/commercial-v3/` : ce rapport et le CSV des fiches à compléter.

Les fichiers de navigation de `bbcbe0c7` sont intégrés, sans modification locale de leur implémentation. Les dossiers préexistants non suivis restent hors livraison.
