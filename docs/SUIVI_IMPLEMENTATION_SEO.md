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
| SEO-01 | En cours | Branche isolée créée depuis la version distante récente ; version effectivement déployée à confirmer |
| SEO-02 | En cours | Contrôle initial de 24 URL dans `baseline/baseline.json` ; compléter les routes privées, pagination et rendu navigateur |
| SEO-03 | À faire | Accès Search Console à rechercher ; aucun chiffre de trafic ou position inventé |
| SEO-04 | Sélection provisoire préparée | 20 produits disponibles avec image et 5 sous-catégories réelles ; ajuster selon ventes et demandes |
| SEO-05 | À faire | Constituer et dédupliquer le panier des 100 recherches candidates |
| SEO-06 | En cours | Rendu catalogue partagé étendu aux routes de familles ; activation de production et budget runtime restent à vérifier |
| SEO-07 | Développé et testé localement | Rendu partagé, paquet compilé, transport backend et hydratation des fiches ; activation de production restante |
| SEO-08 | En cours | Contrats testés pour rupture, référence inactive/absente et panne API ; contrôle après déploiement restant |
| SEO-09 | À faire | Politique de fraîcheur et mesures de charge |
| SEO-10 | Développé et testé localement | Cinq routes de familles, sélection API, métadonnées, navigation et pagination développées ; publication avec la livraison A restante |
| SEO-11 | En cours | Métadonnées des familles et de leurs filtres testées ; audit complet de la politique restant |
| SEO-12 | Développé et testé localement | Sitemap dynamique et projection SQL limitée ; XML d’acceptation de 1 951 URL pour 1 932 produits et 5 familles ; activation restante |
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

Prochaine étape : intégrer la dernière amélioration du catalogue publiée sur `main`, refaire la recette sur la version combinée et préparer la livraison compatible du backend. Le périmètre global reste en cours ; aucune de ces nouvelles fonctionnalités n’a encore été activée en production.
