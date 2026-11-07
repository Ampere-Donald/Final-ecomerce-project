# Pagination hors limites — correction SEO-11

État au 1er novembre 2026 : correction publiée et contrôlée, PR #38 fusionnée dans `69e108f1ed16059c3e64e2ea8a2260efb9187f8b`.

## Défaut mesuré

Le 31 octobre à 19:57:17 UTC, `/catalogue/condensateurs?page=9999` renvoyait HTTP 200, `index, follow`, une canonical vers cette page et zéro carte produit dans le HTML initial. Rapport anonyme : `output/seo-implementation/indexation-edge-cases-probe.json`. Une valeur arbitraire pouvait donc produire une nouvelle page vide admissible à l’indexation.

La documentation Google demande un statut 404 pour les paginations inexistantes dans sa [gestion des URL à facettes](https://developers.google.com/crawling/docs/faceted-navigation), et des URL propres pour les pages réelles dans ses [recommandations de pagination](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading). Le défaut observé n’est pas présenté comme une erreur déjà signalée par Search Console.

## Comportement préparé

- Une syntaxe de page invalide — zéro, négatif, fraction, doublon, valeur non numérique ou supérieure à la limite déjà supportée d’un million — produit une 404 sans appel supplémentaire à l’API.
- Une page supérieure à 1 ne devient absente que si une réponse valide, liée à cette URL, contient zéro résultat, un total numérique entier et un nombre de pages cohérent avec les 24 éléments demandés par page. Le contrôle réutilise le snapshot du fragment déjà lu.
- Une absence établie produit HTTP 404, `noindex, follow`, `no-store`, sans canonical. Le corps du catalogue reste disponible pour retrouver les filtres et la navigation existante. HEAD prend la même décision et renvoie un corps vide.
- Une page réelle, y compris une référence en rupture, conserve HTTP 200 et sa canonical propre. La première page d’une recherche sans résultat conserve son traitement actuel ; le lot ne modifie pas toute la politique des filtres.
- Une panne, une réponse mal formée, un snapshot d’une autre URL ou des totaux incohérents ne prouvent aucune suppression. Le parcours de récupération client existant est conservé. Cette correction ne transforme pas ces échecs en 404 et ne prétend pas introduire un statut 503 pour le catalogue.

Le composant Catalogue utilise la même règle pour maintenir le noindex après chargement des données dans le navigateur. Aucune copie de prix ou de stock n’est ajoutée au build. Les styles et les contrôles commerciaux ne changent pas.

## Vérifications et livraison

La suite frontend comporte 179 tests réussis, dont six nouveaux tests couvrant syntaxe, limites réelles, réponse incohérente, identité du snapshot, GET/HEAD et panne du moteur. Lint et build réussis. Le contrôle `tests/verify-pagination-build.mjs` utilise le véritable paquet CJS et le Worker avec des fixtures locales déclarées ; il est ajouté après le build dans la CI. Ses 22 contrôles réussissent le 1er novembre à 13:31:47 UTC, sans réseau ni écriture commerciale. Le contrôle du balisage Organization et des protections privées réussit aussi. Preuves : `output/seo-implementation/pagination-compiled/report.json` et journaux `pagination-*`.

Le composant partagé fait partie du moteur compilé : nouvelle identité `2c27bc0ec3abf9f4719bf89c001c8209987423c4bb474538b5a8e72d6686c4da`, livrée avec le backend et le Worker correspondants. L’accès navigateur Work reste désactivé au dernier relevé ; aucune recette visuelle nouvelle n’est déclarée réussie.

Le périmètre SEO-11 reste plus large que cette correction : l’audit global des routes, paramètres, contenus et exclusions demeure à terminer.

## Premier passage CI

Sur `6beebdc4`, le contrat runtime #106 réussit ses trois profils Docker et sa préproduction isolée. Dans la CI générale #382, storefront, backend, Android et outils poste réussissent ; le job admin échoue sur `Parcours.ui.test.tsx`, qui attend immédiatement trois appels après apparition du tableau alors que le troisième démarre dans l’effet du panneau enfant. L’assertion conserve le compte exact attendu et utilise désormais `waitFor` pour attendre cet effet. Aucun code produit ni contrôle de confidentialité du tableau n’est modifié. Une nouvelle CI de la tête corrigée doit réussir avant publication ; la première CI n’est pas présentée comme entièrement verte.

## Livraison confirmée

Sur `c9d6ec379475a4d71575b18b53c2e0199fbe1966`, CI générale #383 et runtime #107 entièrement réussis. Les cinq jobs généraux, les trois profils Docker et la préproduction isolée ont été relus. Les six tests Parcours passent aussi localement après correction de l’attente.

Railway : déploiement `49ceaddb-7615-468b-a280-b06d6de63a8e`, statut success. Avant publication du Worker, deux lectures réelles ont confirmé le moteur attendu et un snapshot catalogue établissant la page hors limites. Worker : `8ca50941-afaa-4146-b061-d0ff3ef7c5b6`, déploiement `f622dd4c-55a4-4108-89f4-30cae690a0bb`, confirmé actif à 100 %.

Recette publique commencée à 13:49:48 UTC : 34 contrôles de pagination GET/HEAD réussis sur les cinq familles, une page 2 réelle, la page 9999 et les syntaxes invalides. Les erreurs sont 404/noindex/no-store sans canonical ; les pages réelles restent 200 avec HTML initial et canonical propre. Douze contrôles des fondations réussissent : santé, cinq familles, cinq fiches avec schéma conforme, sitemap de 1 952 URL dont 1 933 produits. Treize contrôles des origines HTTP/www, des parcours privés et de HEAD réussissent également. Total : 59 contrôles publics, aucune écriture commerciale.

Preuves : `pagination-production/report.json`, `pagination-production-foundations/report.json`, `pagination-production-origins/report.json`, `pagination-renderer-match.json`, `pagination-deployments-confirmed.json` et `pagination-worker-deploy.log` dans `output/seo-implementation/`.

Retour arrière prévu, non exécuté : Worker `492e98e4-9d21-476f-9c57-bf54195f7a41` avec moteur `2038804f430092524ccdabd2f824add31975965d63899bbd350697b44f78041d`. Le backend correspondant est le code `14a491ca` et le déploiement précédemment réussi `618c5031-c1ab-49a3-899a-398a3ad5714f`. Aucun fichier backend ni migration n’est modifié dans #38 ; une réversion du merge doit conserver l’historique actuel des migrations et redéployer le code compatible. Restaurer uniquement le Worker ne rétablit pas ce moteur serveur. La syntaxe `wrangler rollback [version-id] --message ...` a été relue dans l’aide native ; aucun rollback n’a été lancé.

## Conservation dans la préparation bilingue

La correction de #38 est intégrée dans `codex/seo-languages` en conservant les routes, fragments éditoriaux et contrôles de langue. La suite locale comporte 200 tests réussis, lint/build réussis ; 44 scénarios compilés de pagination FR/EN passent et le graphe compilé conserve 31 destinations atteignables par langue. Moteur préparé : `5e46438a67cbdb18f99cb08dbd80dca3992c36dd931785eec5dda56fb481e795`, distinct du moteur publié. La nouvelle CI de cette tête et la recette navigateur restent à terminer ; les URL anglaises ne sont pas publiées par #38.
