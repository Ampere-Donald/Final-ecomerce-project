# Livraison des fondations SEO — procédure et preuves

Périmètre : première activation du rendu catalogue/produit et du sitemap, sans présumer que les autres lots du plan SEO sont terminés. Aucun changement du schéma Prisma ne fait partie de cette livraison.

## État vérifié le 28 octobre 2026

- Branche `codex/seo-foundations`, PR #25 ouverte en brouillon et fusionnable lors du contrôle.
- Pipeline `Catalogue runtime contract`, exécution GitHub `40688994121` : succès. Le workflow construit réellement `Dockerfile.catalogue` pour les deux configurations API et charge les gardes de démarrage dans les images, sans connexion à la base. Une modification ultérieure impose une nouvelle preuve sur son commit exact.
- Railway : projet `a1483bed-b272-4b75-84ed-3989c888fc57`, environnement production `8706a3f1-a15a-4f2b-a79f-7eff04e451f6`, backend `05d24047-d8c9-4899-8a4d-adc84682f824`.
- Déploiement backend observé `aaa7d92f-7ce0-4dea-8964-1e4ecad176a2` : SUCCESS. Aucun travail staged/applying lors du contrôle. Revérifier avant toute mutation.
- Configuration initialement observée : source `main`, racine `/Back-end`, Nixpacks, commande `npm run start:migrate:prod`. Le paquet React partagé exige un build depuis la racine du dépôt ; l’activation ne consiste donc pas seulement à ajouter une variable.

## Contrôles avant activation

1. Vérifier le commit exact de la PR et ses contrôles : CI générale et contrat runtime. Ne pas réutiliser le résultat d’un ancien commit pour certifier un changement ultérieur.
2. Construire le frontend avec `VITE_CATALOGUE_SSR_BUILD=true` et la configuration API publique retenue. Conserver son manifeste `.catalogue-backend/manifest.json`, les assets et le commit comme une même version.
3. Construire le backend depuis la racine avec `Dockerfile.catalogue` et la même configuration API. L’image doit contenir `.storefront-renderer`, les dépendances de production, le client Prisma généré et les gardes de démarrage existantes.
4. Exécuter dans cette image `verify-catalogue-image.cjs` avec le manifeste frontend monté en lecture seule, puis `verify-release-image.cjs`, réseau désactivé. Le premier contrôle doit couvrir catalogue, produit, JSON-LD, prix absent, rupture, exclusion des données internes et sitemap ; le second vérifie les sources de migrations et leurs dépendances.
5. Conserver la configuration Railway précédente et l’identifiant du Worker Cloudflare précédent, sans exporter leurs secrets dans les preuves publiques. Vérifier qu’aucun déploiement concurrent ni changement staged étranger n’est en cours.

## Ordre de livraison

1. Fusionner uniquement la version testée. Tenir compte du déploiement automatique éventuel depuis `main` et attendre son état terminal avant de modifier la configuration du service.
2. Livrer l’image backend compatible depuis la racine du dépôt, en conservant les variables, le domaine, les politiques et la commande de démarrage appropriée. Garder l’option de rendu désactivée jusqu’à validation du paquet livré.
3. Activer `STOREFRONT_CATALOGUE_RENDERING` conformément au contrat du service et vérifier les endpoints anonymes de rendu avec le rendererId exact du frontend. Vérifier aussi le refus d’une version incompatible. Les gardes de migrations existantes restent en place.
4. Livrer le Worker candidat `catalogue-backend-worker.js` avec les assets et le manifeste de la même construction ; ne pas associer un Worker récent à un paquet backend d’une autre version.
5. Contrôler publiquement les cinq familles, un produit de chaque famille, les canonical et directives, la pagination et le sitemap. Vérifier prix/stock entre HTML, JSON-LD et navigateur. Refaire le parcours mobile sans commande réelle ni modification de stock.
6. Vérifier la santé du backend et les erreurs de rendu après publication. Enregistrer versions, heures, réponses et résultats. Soumettre le sitemap dans Search Console lorsque l’accès est disponible ; distinguer soumission, indexation et classement.

## Retour arrière

En cas de régression commerciale, exposition de données ou panne de rendu, rétablir d’abord le Worker et les assets précédents pour retirer la dépendance au nouveau rendu. Désactiver ensuite l’option backend et, si nécessaire, rétablir sa version/configuration précédente après vérification de compatibilité avec l’état courant de la base. Ne jamais restaurer une ancienne base ni annuler les commandes ou mouvements de stock intervenus. Une baisse ou absence de progression immédiate des positions ne justifie pas un retour arrière technique.

## Éléments restant à prouver

La construction Docker en CI n’est pas une activation de production. Restent notamment : configuration de construction Railway, concordance des deux versions effectivement livrées, recette publique, accès Search Console, performance en conditions réelles et enrichissement commercial du pilote. Le suivi global demeure dans `SUIVI_IMPLEMENTATION_SEO.md`.

## Première activation effectuée

PR #25 fusionnée dans `8c5c1022` après CI générale et Docker réussies sur sa tête exacte `8e2fa687`. Le 28 octobre, Railway a livré le paquet depuis la racine (`Dockerfile.catalogue`) puis activé le rendu ; déploiement final `ce5e1c96-c2f6-4d4f-9d51-af81eaa5df94` en SUCCESS. Worker `89e28bce-3f26-45ea-88d1-e07857d7c044`, version précédente `a5dbf7a4-1076-46ac-8fbe-a1c994a88a42`.

Les endpoints vérifiés partagent le rendererId `456f3b2f3d34583071d32f117d4101313e6897a53a51283bad5e17dd3694b983`. La recette publique couvre les cinq familles, cinq fiches et le sitemap de 1 951 URL. Les preuves détaillées et les limites sont consignées dans le suivi. Ces éléments remplacent les mentions préparatoires ci-dessus pour cette première activation ; les prochains déploiements doivent refaire les contrôles sur leurs propres versions.

La configuration durable utilise l’entrée `catalogue-backend-worker.js`. Un build frontend normal génère désormais son manifeste de version et ses styles, sans dépendre de `VITE_CATALOGUE_SSR_BUILD`. Le paquet backend doit toujours être construit avec la même configuration API publique. Le chemin Docker Railway est conservé via `RAILWAY_DOCKERFILE_PATH=Dockerfile.catalogue` ; l’option de rendu doit valoir exactement `true` pour l’activer. Les autres variables et la commande de démarrage existante n’ont pas été remplacées.
