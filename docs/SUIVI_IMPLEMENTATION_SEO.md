# Suivi de l’implémentation SEO NEWOTEG

Plan validé par l’utilisateur le 27 octobre 2026. Objectif complet conservé : lots 0 à 6 et tâches SEO-01 à SEO-36 du plan d’implémentation. Les travaux décrits comme préparés ne sont pas encore publiés.

## Base de travail

- Branche : `codex/seo-foundations`.
- Checkout : `C:/Users/pc/.codex/worktrees/newoteg-seo/Newoteg`.
- Base vérifiée : `dd4e6aaf`, amélioration du démarrage du catalogue intégrée à `origin/main` lors de la préparation.
- Plan de référence : `C:/Users/pc/Documents/Newoteg/docs/PLAN_IMPLEMENTATION_SEO_NEWOTEG_2026-10-27.md`.
- Preuves : `C:/Users/pc/Documents/Newoteg/output/seo-implementation/`.

## État des tâches

| Tâche | État | Preuve ou prochaine action |
|---|---|---|
| SEO-01 | Version identifiée et intégrée | PR #25 fusionnée dans main : 8c5c1022 ; backend et Worker livrés, identifiants ci-dessous |
| SEO-02 | En cours | Contrôle initial de 24 URL dans `baseline/baseline.json` ; compléter les routes privées, pagination et rendu navigateur |
| SEO-03 | À faire | Accès Search Console à rechercher ; aucun chiffre de trafic ou position inventé |
| SEO-04 | Sélection provisoire préparée | 20 produits disponibles avec image et 5 sous-catégories réelles ; ajuster selon ventes et demandes |
| SEO-05 | Matrice préparée | 100 formulations distinctes réparties 50/20/15/10/5, reliées à une cible ; docs/MATRICE_RECHERCHES_SEO_NEWOTEG.md. Priorisation quantitative en attente des données Google et commerciales |
| SEO-06 | Activé et contrôlé en production | Cinq familles avec cartes en HTML ; mesures de charge et CPU réelles à compléter |
| SEO-07 | Activé et contrôlé en production | HTML et JSON-LD sur cinq fiches représentatives ; concordance de version backend/frontend vérifiée ; hydratation mobile contrôlée sur une fiche |
| SEO-08 | En cours | Contrats testés pour rupture, référence inactive/absente et panne API ; contrôle après déploiement restant |
| SEO-09 | À faire | Politique de fraîcheur et mesures de charge |
| SEO-10 | Publié et contrôlé | Cinq routes de familles, métadonnées et cartes HTML vérifiées publiquement ; page 2 de Condensateurs rendue avec canonical propre |
| SEO-11 | En cours | Métadonnées des familles et de leurs filtres testées ; audit complet de la politique restant |
| SEO-12 | Publié et contrôlé | Sitemap public de 1 951 URL, dont 1 932 produits correspondant au total API ; cinq familles, URL uniques et absence de routes privées contrôlées ; soumission Search Console restante |
| SEO-13 | En cours | Product/Offer/BreadcrumbList partagés avec le rendu, sans offre si prix ou stock inconnus ; informations boutique et validation externe restantes |
| SEO-14 | Vérification documentaire engagée | Registre des 20 fiches dans REGISTRE_ENRICHISSEMENT_PILOTE_SEO.md ; photos examinées et points non établis conservés, sans inventer de caractéristiques |
| SEO-15 | Aides au choix publiées et contrôlées | Trois repères sourcés par famille, FR/EN, après les produits dans le HTML. Titre audio élargi à audio et TV selon le contenu réel. Maillage vers les futurs guides à compléter |
| SEO-16 | En cours | Liens vers familles et pagination HTML intégrés ; compléter accueil et fiches |
| SEO-17 | À faire | Examiner et étendre les événements de parcours existants |
| SEO-18 | À faire | Tableau de suivi et attribution |
| SEO-19 | À faire | Mesures mobile avant/après et recette visuelle |
| SEO-20 | À faire | Modèle éditorial versionné et validation au build |
| SEO-21 | À faire | Pages de guides et dossiers, rendu et indexation |
| SEO-22 | À faire | Quatre guides pilotes documentés |
| SEO-23 | À faire | Quatre dossiers de remplacement vérifiés |
| SEO-24 | À faire | Maintenance éditoriale et sources |
| SEO-25 | À faire | Vérification des faits commerciaux et informations locales |
| SEO-26 | À faire | Audit Business Profile accessible et corrections proposées |
| SEO-27 | À faire | Scripts vidéo et dispositif d’avis |
| SEO-28 | À faire | Dix partenaires et messages préparés ; aucun envoi sans instruction explicite |
| SEO-29 | À faire | Vérification de l’éligibilité Merchant Center |
| SEO-30 | À faire | Langue déterminée par l’URL |
| SEO-31 | À faire | Traduction du périmètre pilote |
| SEO-32 | À faire | Annotations linguistiques et recette FR/EN |
| SEO-33 | À faire | Évaluation commerciale du pays pilote |
| SEO-34 | À faire | Extension vers 50 puis jusqu’à 100 fiches selon vérification |
| SEO-35 | À faire | Extension vers 8–12 familles, 8 guides et 8 dossiers |
| SEO-36 | À faire | Bilans à 30, 60 et 90 jours sur données accumulées |

## Vérifications initiales

- Le premier passage des tests du storefront après ajout des familles et du contrat d’hydratation : 142 tests réussis.
- Le script `tooling/seoBaseline.mjs` a contrôlé 24 URL publiques et enregistré les 20 candidats sans écriture en production.
- Le test du script de préchargement réellement émis vérifie ses dépendances et la sélection d’une famille avant le démarrage de React.
- La connexion au navigateur intégré a échoué avant toute navigation : le pont natif a été refusé. La vérification locale a ensuite été effectuée avec agent-browser et Edge.
- Le rendu React partagé a été exécuté avec les données publiques réelles des cinq familles : 24/24/24/8/4 produits dans le HTML des premières pages, pour des totaux de 93/95/185/8/4. Preuves dans `family-render/render-report.json` et les cinq fichiers HTML associés. Cette vérification ne prouve pas encore l’activation du rendu en production.
- Le navigateur local confirme 24 produits sur Condensateurs, le passage à la page 2 et sa canonical propre. À 390 px, aucun débordement du document ; la navigation de familles occupe 48 px après ajustement. Capture dans `family-render/condensateurs-mobile.png`.
- Lint, compilation et build du storefront réussis. Dernier journal de build dans `build.log`.
- Le CLI GitHub installé n’a pas de session authentifiée. L’outil GitHub connecté a ensuite été rétabli avec ses arguments documentés : accès au dépôt confirmé. Railway est également accessible en lecture.
- Vingt fiches pilotes ont été rendues avec leurs données publiques réelles ; preuve dans `product-render/report.json` et les vingt HTML associés. Les prix inconnus restent à confirmer, sans offre chiffrée inventée.
- La recette navigateur couvre une fiche de chacune des cinq familles avec et sans JavaScript, la cohérence prix/balisage, la canonical, l’absence de débordement à 390 px, le dialogue de conseil et l’ajout local au panier. Onze vérifications réussies, aucune erreur d’hydratation et aucune écriture réseau ; `product-browser/hydration-report.json` et captures à 390/1440 px.
- Le paquet CJS réel a été chargé par le vérificateur backend avec contrôle de checksum ; rendu catalogue, produit, scripts JSON échappés et sitemap vérifiés. Le build du backend et 15 tests de ses contrats SEO passent.
- Le sitemap d’acceptation, généré par le paquet compilé à partir de quatre pages de lecture de l’API publique, contient 1 951 URL (1 932 produits, 5 familles et 14 pages stables). Validation XML réussie, aucune route privée et aucune date de modification inventée ; `sitemap/report.json` et `sitemap-preview.xml`.
- Configuration Railway observée : service `Final-ecomerce-project` du projet `meticulous-perfection`, source `/Back-end` avec Nixpacks ; la variable d’activation du rendu ne figure pas dans les noms de variables du service. Cette configuration n’embarque pas encore le paquet de rendu. Une livraison compatible devra préparer ce changement avant l’activation.

## Recette de la version combinée — 28 octobre 2026

- L’amélioration des premières rangées du catalogue (`fa2b0b5f`, PR #24) a été intégrée dans la branche SEO ; commit combiné `c0ae6ae8`.
- PR de préparation ouverte en brouillon : https://github.com/Ampere-Donald/Final-ecomerce-project/pull/25. Aucun déploiement SEO de production effectué à ce stade.
- Suites de la version combinée : 151 tests frontend et 503 tests backend réussis ; builds frontend/backend et contrat du paquet compilé réussis. Journaux dans le dossier de preuves.
- Après des interruptions du réseau vers le domaine API direct, la recette locale utilise le point d’entrée public `newoteg.com` pour les lectures anonymes. Cela ne prouve pas le transport Worker/backend de production, vérifié séparément par les contrats.
- Nouvelle recette complète réussie : `family-render-2026-10-28/render-report.json` contrôle les cinq familles et leurs liens de pagination ; `product-browser-2026-10-28/hydration-report.json` contrôle cinq fiches avec et sans JavaScript et une interaction conseil/panier, soit 11 contrôles, zéro erreur et zéro écriture réseau. Les anciens rapports sans date de dossier ne constituent plus la dernière preuve.
- Le contrôle navigateur attend désormais un bouton effectivement activé après hydratation. Captures actualisées à 390 et 1440 px dans le dossier daté.
- Matrice des 100 recherches candidates préparée, sans volumes ni positions supposés. Les cibles éditoriales proposées restent à créer et ne sont pas soumises au sitemap.

Les étapes de livraison du backend et du Worker réalisées ensuite sont détaillées ci-dessous. Les lots éditoriaux, locaux et internationaux restent en cours ou à réaliser.

## Activation publique — 28 octobre 2026

- PR #25 fusionnée après succès de la CI générale #345 et du contrat runtime #71 sur `8e2fa687`. Merge `8c5c1022cb4adb2910f42e7584c133c67da5236d`.
- Premier déploiement automatique backend `ac1ae1ce-120e-4221-af0f-2f950dbbb56a` : SUCCESS. Configuration de construction ensuite passée de `/Back-end` à `/`, avec `Dockerfile.catalogue`. Les variables existantes sont conservées ; ajout du chemin Docker et de l’option de rendu.
- Image avec paquet de rendu et option désactivée : déploiement `7db50dfd-e3f0-41d9-9182-7868e0e1b10b`, SUCCESS. Copie de `.storefront-renderer` confirmée dans les logs du build.
- Activation `STOREFRONT_CATALOGUE_RENDERING=true` : déploiement `ce5e1c96-c2f6-4d4f-9d51-af81eaa5df94`, SUCCESS. Pas de travail staged/applying au dernier contrôle.
- Endpoints produit, catalogue et sitemap publics : HTTP 200 avec rendererId `456f3b2f3d34583071d32f117d4101313e6897a53a51283bad5e17dd3694b983`. Version incompatible refusée avec HTTP 409. Preuve : `backend-production-runtime.json`.
- Worker actif `89e28bce-3f26-45ea-88d1-e07857d7c044`. Une première tentative a expiré côté réseau ; l’historique a confirmé l’absence de publication avant la nouvelle tentative réussie. Version précédente immédiatement observée : `a5dbf7a4-1076-46ac-8fbe-a1c994a88a42` (déploiement automatique du merge).
- Recette HTTP sans JavaScript : 12 contrôles réussis, incluant santé backend, cinq familles, cinq produits avec canonical/balisage et sitemap ; `production-2026-10-28/report.json`. Sitemap public enregistré dans le même dossier.
- Recette Edge à 390 px : famille et fiche transistor hydratées, canonical correcte, aucun débordement horizontal ni erreur JavaScript. Captures et `browser-report.json` dans le même dossier. Deux tentatives de télémétrie Cloudflare bloquées par le banc de recette ; aucune écriture réseau exécutée. Cette recette ne mesure pas encore les Core Web Vitals ni le chargement complet des images.
- La configuration durable du prochain déploiement doit employer `catalogue-backend-worker.js` et générer ses artefacts à chaque build normal ; modification préparée et build sans option spéciale vérifié. Ne pas revenir silencieusement à l’entrée sans rendu lors d’un prochain déploiement automatique.
- Contrôles publics complémentaires réussis : pagination et canonical de page 2, famille et produit inexistants en 404, filtre en noindex, document privé en noindex ; `production-2026-10-28/routes-report.json`.
- Banc Miniflare/workerd avec l’entrée de production : 11 documents privés protégés, aucun appel au renderer pour ces documents, métadonnées publiques conservées lorsque le renderer est indisponible, requête anonyme au catalogue et image statique inchangée. Le banc a été adapté à l’appel serveur désormais attendu ; preuve dans `production-worker-private-assets/private-assets-result.json`.

Prochaine étape : intégrer la configuration durable de publication après ses contrôles, compléter la recette publique de pagination/erreurs, puis poursuivre les fiches sourcées, les familles et la mesure. La livraison commerciale A complète n’est pas terminée : 20 fiches enrichies, attribution et performance restent notamment à réaliser.

## Configuration automatique et préparation éditoriale — 28 octobre 2026

- PR #26 fusionnée après CI #347 et contrat Docker #73 réussis sur `4572ab69` ; merge `e607c01a`. Backend automatique `11a80c8e-d402-4e8d-baf9-9e22e22c97ac`, SUCCESS.
- Le contrôle après ce déploiement a détecté une absence de HTML de catalogue/produit et un sitemap 503. La version Cloudflare automatique `a64ff910-a7e8-442f-b426-a66427f7c3b4` a été retirée au profit de la version validée `89e28bce-3f26-45ea-88d1-e07857d7c044`. Le retour arrière est confirmé ; catalogue, produit et sitemap sont rétablis (`post-rollback-public.json`).
- Diagnostic : le Worker construit automatiquement porte le rendererId `19ad716c361a1dcf0f747e2718ad7940ef69589511d24ac6562aec4ebc1aaec8`, correspondant exactement à la variante API directe du contrat Docker #73. Le backend expose `456f3b2f…`, variante `/api`. Le refus des versions différentes fonctionne, mais révélait la divergence de configuration de construction. Le contenu du dernier script téléversé et les logs du pipeline ont été utilisés ; aucun secret enregistré dans les preuves.
- La modification des paramètres Workers Builds via l’API a été refusée en 403 avec la session disponible. Le correctif est donc porté par le dépôt : le profil documenté `WORKERS_CI=1`, branche `main`, fixe explicitement l’API publique à `/api` avant le chargement Vite, pour les deux constructions. Les autres profils conservent leurs variantes explicites. La matrice CI ajoute ce cas réel et vérifie l’identité avec l’image Docker construite pour `/api`.
- Reproduction locale avec la variable héritée `VITE_API_URL=https://api.newoteg.com` et le profil Cloudflare production : build et contrat compilé réussis, identité `46daa88d…`, identique au nouveau contenu construit normalement pour `/api`. Les nouveaux conseils changent le paquet ; ils ne doivent pas être publiés avec l’ancien backend.
- Préparation du contenu : cinq aides au choix sourcées, sous les produits ; sources Nichicon, onsemi, Panasonic archivé, MEAN WELL et Fluke. Aucun document général ne certifie les produits en stock. Le registre de vingt fiches relève notamment un mélange audio/TV, les suffixes non confirmés, les températures hétérogènes d’une photo de condensateurs, une incohérence de puissance et des modèles de multimètres imprécis.
- Vérification locale : 151 tests réussis, rendu des cinq familles avec contenu éditorial après les cartes ; Edge à 390/1440 px pour les familles circuits et multimètres, aucun débordement ni erreur JavaScript. Preuves : `family-guidance-render` et `family-guidance-browser`. L’enrichissement individuel des vingt fiches reste à faire, avec les preuves et confirmations nécessaires.

Prochaine action : publier le correctif de configuration et les aides au choix après réussite de leur matrice CI, puis recontrôler les deux déploiements réels. La production reste sur la version restaurée pendant cette préparation.

## Livraison des aides au choix et correction du profil — résultat

- PR #28 fusionnée après CI générale #351 et contrat runtime #75 réussis sur `3fa357fe`. Merge `a2fe401afb07d10173cbd818c022c26933c22f10`. La modification admin de la PR #27 (`dbae0eac`) a été conservée.
- Backend `d684cd48-21cd-4cad-a2bc-372756acb348` : SUCCESS ; aucun changement staged/applying au contrôle. Worker automatique actif `01c8b828-6c72-4629-b174-0e850baeee3d`, publié le 28 octobre à 14:12 UTC. Son paquet contient désormais le rendererId attendu `46daa88d5b0626f2dd3a8f1f4e11e4b432a7b16315eac0ed9e4cf8ec1c71f70e`.
- Deux premières recettes publiques après publication ont encore rencontré un repli sans HTML ; les logs backend contenaient des refus 409. Ces échecs sont conservés dans `production-guidance-2026-10-28` et `production-guidance-confirmed`, sans les présenter comme des réussites.
- Recette complète suivante réussie, commencée à 14:19:58 UTC : santé backend, cinq familles avec HTML, cinq produits avec canonical/JSON-LD et sitemap de 1 951 URL pour 1 932 produits. Preuve : `production-guidance-final/report.json` et sitemap associé. Quatre lectures consécutives de Condensateurs ont également livré le HTML et les nouveaux conseils. Cette recette ne remplace pas une mesure de fiabilité prolongée ni les Core Web Vitals.
- Le propriétaire ne peut pas confirmer les caractéristiques manquantes et demande de poursuivre par recherche et photographies. Cette contribution n’est donc plus attendue comme préalable. Recherche enregistrée dans `recherche-identification-produits.json` : modèle DT-830D lu sur la photo, référence AWX-FS12V20A et mentions de boîte relevées, document officiel ST du 2N3773 trouvé et lu. Aucune notice d’un autre fournisseur n’a été assimilée à une certification des exemplaires vendus.

Prochaine étape : enrichir les fiches avec les faits photographiques et documentaires disponibles, conserver les caractéristiques non établies comme telles, puis poursuivre attribution, performance et bibliothèque technique. Les vingt fiches enrichies et la livraison commerciale A complète restent à réaliser.
