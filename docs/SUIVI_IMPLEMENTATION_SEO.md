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
| SEO-14 | À faire | Enrichissement sourcé des 20 fiches pilotes |
| SEO-15 | En cours | Présentation concise des cinq familles intégrée ; compléter les aides de choix après recherche |
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
