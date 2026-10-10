# Catalogue : rendu initial réel — essai du 10 octobre 2026

**Décision : conserver cette implémentation en expérimentation. Elle n'est pas activée sur newoteg.com.** Le catalogue apparaît sensiblement plus tôt dans le laboratoire mobile, mais son rendu React dépasse le budget CPU de l'offre Workers Free réellement utilisée. L8 et l'objectif A–Z restent ouverts.

## Changement réalisé

Le Worker peut lire les 24 produits et les catégories publics avant de renvoyer la page, rendre les composants existants et transmettre un petit état public à React pour reprendre le même DOM. La recherche, les familles, les bornes de prix, le stock, le tri et la pagination partagent une seule fonction de construction de requête. Aucun prix ou stock n'est figé au build.

Le contrat de données exclut les champs internes et les objets imbriqués non autorisés. Les deux lectures partent vers l'API fixe, sans cookie ni authentification du visiteur ; les redirections sont refusées par leur statut. Le JSON intégré échappe les caractères pouvant fermer une balise script. Une panne, une réponse invalide ou le délai de deux secondes conservent le fonctionnement client existant. Ce repli ne déclare pas une panne comme un catalogue vide. Le document avec produits utilise `Cache-Control: no-store`.

Le démarrage reprend les données initiales récentes, évite la seconde lecture immédiate des produits et recharge normalement après changement d'URL. Les contrôles de filtre/tri attendent l'attachement de leurs gestionnaires. Le prix d'une offre utilise le même instant au premier rendu serveur/client, puis son échéance existante retire le prix devenu non autoritatif. Les fiches et la commande continuent à relire l'API.

Principaux fichiers : `catalogueQuery.js`, `initialCatalogue.js`, `serverCatalogue.jsx`, `InitialResources.jsx`, `StorefrontFrame.jsx`, `useResource.js`, `Catalogue.jsx`, `ProductCard.jsx`, `main.jsx`, `App.jsx`, `worker.js`, `tooling/buildCatalogueRenderer.js`. Les entrées `catalogue-worker.js` et `catalogue-preview-worker.js` sont expérimentales. **Le fichier de production `wrangler.jsonc` garde `main: worker.js`, sans fonction de rendu injectée.** Le build normal ne génère pas de renderer ; le build expérimental exige `VITE_CATALOGUE_SSR_BUILD=true`.

## Validation et mesure comparable

- Lint, 100 tests Node et build Vite de production réussis. Renderer webworker compilé : environ 420 ko ; upload Worker expérimental compressé : environ 161 Kio.
- Six contrats navigateur locaux : vrais produits, total, styles et recherche native sans JS aux largeurs 360/390/768/1024/1440 ; reprise des mêmes nœuds et contenus commerciaux sans requête produit doublée ; tri, pagination et filtre stock ; lecture fraîche après navigation/retour navigateur ; URL filtrée directement ; restauration anglais/comparaison mémorisés ; repli honnête sur API 503. Aucune erreur de rendu ni écriture métier.
- Même contrat distant sur la version d'essai : les trois groupes applicables passent. La fixture de panne appartient au serveur local ; le premier lancement distant l'attendait à tort et a été corrigé pour ne pas inventer une panne de la vraie API.
- Sept contrats existants d'accueil passent après extraction du cadre commun : session, panier, favoris, anglais, stockage refusé, navigation et échec volontaire du chunk. La régression de recherche saisie avant reprise passe également, avec et sans focus.
- Le premier test comparait tout le texte des cartes ; le repli normal d'une image indisponible ajoutait « Visuel en préparation ». La comparaison porte maintenant sur le contenu commercial. Ce n'était pas une modification de prix ou de stock.

Comparaison au HEAD `099e1368`, archivé et buildé séparément, mêmes vrais GET publics figés uniquement dans le laboratoire, gzip local, Edge 390×844, CPU ×4, latence 150 ms, débit 200 000 octets/s, cache navigateur froid, trois passages :

| Mesure catalogue | Avant | Essai |
| --- | ---: | ---: |
| LCP, trois passages (ms) | 4320 / 4208 / 4664 | 2384 / 2356 / 1924 |
| LCP médian (ms) | 4320 | 2356 |
| CLS | 0 | 0 |
| JavaScript compressé transféré (octets) | 195897 | 197296 |

La médiane gagne environ 45,5 %. Les trois passages expérimentaux respectent le seuil local LCP de 2500 ms. **Cette mesure locale ne prouve ni le LCP public, ni les percentiles des visiteurs, ni un téléphone physique ou l'INP.** Les séries publiques antérieures restent distinctes.

## Vérification Cloudflare et raison de la non-activation

Le propriétaire ne connaissait pas l'offre ; `/subscriptions` n'était pas lisible par l'accès OAuth actuel. Une tentative d'upload non activé avec plafond explicite de 10 ms a reçu l'erreur Cloudflare **100328**, indiquant que les plafonds personnalisés ne sont pas disponibles sur **Free**. Cette réponse confirme l'offre Workers gratuite ; aucun achat, changement d'abonnement ou plafond de production n'a été effectué.

Le premier renderer ne fonctionnait pas sur l'edge : `redirect: error` est refusé par Workers. Le passage à `manual`, avec rejet de tout statut 3xx, corrige le défaut sans suivre de redirection. La version d'essai `4626e468-e978-46e1-b58a-cb34ae40f367` a ensuite fourni le HTML des vrais produits pour neuf GET, sans erreur 1102. Un appel ultérieur est revenu au rendu client, puis l'appel suivant a de nouveau rendu le catalogue : le succès initial ne garantit donc pas la disponibilité du rendu sur chaque lecture API.

Les [URLs de version Cloudflare ne donnent pas accès aux journaux CPU](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/#limitations). Un Worker temporaire séparé, `newoteg-catalogue-lab-20261010`, a été créé après contrôle indépendant de son absence. Il n'avait aucun domaine de production, uniquement ASSETS, des GET/HEAD publics autorisés et noindex/nofollow ; compte et écritures interdits.

Version du Worker de mesure : `77330200-a57e-4f2f-936f-2292b12f66c0`. Les traces de nos seules requêtes donnent **70 / 30 / 24 / 19 / 22 / 30 / 19 / 18 / 21 ms de CPU**, médiane **22 ms**. Tous ces appels renvoient 200 et le HTML initial, mais dépassent 10 ms. Les [limites officielles](https://developers.cloudflare.com/workers/platform/limits/#cpu-time) précisent que la tolérance aux dépassements ponctuels ne permet pas de tenir durablement au-dessus du budget. Le retour 200 ne suffit donc pas à autoriser l'activation. Un simple chronométrage Node Windows n'est pas retenu comme certificat de coût edge.

Le Worker temporaire a été supprimé après récupération des traces, sans toucher à `newoteg-client`. Les versions d'essai non activées restent dans son historique ; elles ne doivent pas être promues en production. L'état public précédemment publié est conservé. L'essai n'est pas poussé sur main.

## Preuves et suite technique

Preuves locales : `C:/Users/pc/Documents/Newoteg/output/implementation-work/catalogue-html-20261010/` : builds, mesures complètes, captures, contrats navigateur, réponse de refus du plafond, traces et confirmation de suppression. Le fichier `result.json` contient uniquement les routes publiques, versions, statuts et temps nécessaires ; les en-têtes et informations de connexion ne sont pas repris dans le rapport versionné.

La prochaine adaptation doit réduire le travail React par requête ou effectuer ce rendu sur le backend Railway déjà disponible. Elle devra relire les données publiques, conserver la concordance serveur/client et le repli, puis être mesurée sur le runtime réel avant activation. Un simple cache de pages avec anciens prix/stocks ou l'absence d'erreur 1102 ne clôt pas cette condition. Les validations métier, transports email/SMS, projet pilote, téléphone physique et observation réelle restent également ouverts.

Pour recompiler l'essai depuis `Font-end` : définir `VITE_API_URL=/api`, `VITE_CATALOGUE_SSR_BUILD=true`, puis `npm run build -- --outDir dist-release`. Le test `tests/verify-catalogue-hydration.cjs` exige `CATALOGUE_TEST_URL`, `CATALOGUE_TEST_OUTPUT`, `PLAYWRIGHT_MODULE` et `BROWSER_EXECUTABLE`. La configuration séparée `wrangler.catalogue-lab.jsonc` permet de refaire un essai autorisé ; ne pas utiliser `wrangler versions deploy` pour promouvoir les anciennes versions expérimentales sur le domaine public.
