# Pagination hors limites — correction SEO-11

État au 1er novembre 2026 : correction en préparation, non publiée. Branche `codex/seo-pagination`, base de production `14a491ca`.

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

Le composant partagé fait partie du moteur compilé : nouvelle identité `2c27bc0ec3abf9f4719bf89c001c8209987423c4bb474538b5a8e72d6686c4da`, livraison backend/Worker à coordonner après CI. La version Worker de retour arrière et la compatibilité du backend doivent être relevées à la publication. Aucun déploiement de ce lot ni contrôle public après correction n’est encore affirmé. L’accès navigateur Work reste désactivé au dernier relevé ; aucune recette visuelle nouvelle n’est déclarée réussie.

Le périmètre SEO-11 reste plus large que cette correction : l’audit global des routes, paramètres, contenus et exclusions demeure à terminer.

## Premier passage CI

Sur `6beebdc4`, le contrat runtime #106 réussit ses trois profils Docker et sa préproduction isolée. Dans la CI générale #382, storefront, backend, Android et outils poste réussissent ; le job admin échoue sur `Parcours.ui.test.tsx`, qui attend immédiatement trois appels après apparition du tableau alors que le troisième démarre dans l’effet du panneau enfant. L’assertion conserve le compte exact attendu et utilise désormais `waitFor` pour attendre cet effet. Aucun code produit ni contrôle de confidentialité du tableau n’est modifié. Une nouvelle CI de la tête corrigée doit réussir avant publication ; la première CI n’est pas présentée comme entièrement verte.
