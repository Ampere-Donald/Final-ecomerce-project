# Bibliothèque technique — livraison préparée le 31 octobre 2026

État : développement local et recette technique en cours. Ces nouveaux guides ne sont pas encore publiés en production. La recette visuelle et d'hydratation dans un navigateur reste à effectuer : le contrôle local des navigateurs est désactivé dans les paramètres Work.

## Contenus du premier lot

| URL prévue | Contenu | Source principale |
|---|---|---|
| `/guides/lire-marquage-composant` | Marquage complet, fabricant, boîtier et conditions de la documentation | ST, 2N3773, révision 2, octobre 2008 |
| `/guides/choisir-condensateur-electrolytique` | Critères d'application, identification de série, dimensions et limites du catalogue | Nichicon, Technical Notes et Application Guidelines |
| `/guides/choisir-multimetre-usage` | Besoin de mesure, modèle exact, catégorie et tension admissible | Fluke, Guide to Digital Multimeter Safety |
| `/guides/identifier-connecteur` | Contacts, pas, orientation, plans et distinction mécanique/électrique | JST, série XH |

Les documents fabricants ont été relus le 31 octobre. Les guides comportent des repères de source près des explications, une date de revue, des limites et une action de conseil. Les textes sont en français ; aucune traduction anglaise n'est annoncée. Le document ST est ancien et son exemple n'authentifie pas les pièces du catalogue. Les autres documents généraux ne certifient pas davantage une série, une catégorie CAT ou un stock NEWOTEG.

Quatre dossiers de comparaison sont préparés en brouillon à partir de références du catalogue : deux formats courts de condensateurs, format court/long de condensateur, deux alimentations 12 V et changement de multimètre selon l'usage. Chaque brouillon indique les preuves manquantes. Ils ne sont pas des cas de remplacement validés. La liste et la lecture des cas métier nécessitent l'authentification admin existante ; aucun cas ni verdict n'a été créé artificiellement en production.

## Modèle et frontière de publication

Source éditoriale unique : `Font-end/editorial/entries.json`. Champs : identifiant, slug, langue, type guide/dossier, statut draft/review/published, titre, résumé, sections structurées, sources et repères, familles, produits liés, dates et portée de revue. Les dossiers publiables doivent préciser origine, candidat, contexte, différences, conditions, conclusion et référence à une validation métier documentée.

`tooling/prepareEditorial.mjs --write` produit deux projections à relire dans Git : les contenus publics complets et un petit index de navigation/métadonnées. Le build vérifie leur égalité avec la projection calculée ; il échoue si elles sont périmées. Les brouillons et motifs internes de blocage restent hors de ces projections. Leurs fichiers sources ne sont jamais importés par l'application ou le Worker.

Le validateur refuse notamment les identifiants ou URL en collision, dates impossibles/futures, sources sans HTTPS ou avec identifiants/paramètres, références de source inconnues, famille inexistante, tableau incohérent, champ libre HTML, prix/stock ajouté au modèle et publication incomplète. Les textes sont rendus par React sans HTML libre.

L'état published dans le registre désigne le contenu sélectionné pour la version construite, pas une preuve de sa présence sur le site public. La livraison effective doit être enregistrée séparément après déploiement et recette.

## Rendu et maillage

- `/guides` devient la liste des quatre guides ; les pages FAQ et livraison gardent leur contenu existant.
- Les détails comportent sommaire à ancres, sections, tableau avec légende et en-têtes lorsqu'utile, sources, limites, familles et fiches liées, puis conseil.
- Les aides au choix des familles concernées pointent vers les guides. Les corps des guides et leurs styles restent dans un chargement différé propre à la bibliothèque.
- Le paquet de rendu partagé génère des fragments HTML statiques au build. L'entrée Worker réelle les injecte avec leurs styles ; aucune lecture de compte, prix ou stock n'est nécessaire à ce rendu. Le navigateur doit hydrater le même composant français.
- La projection publique alimente routes, métadonnées et sitemap. Les slugs inconnus et les brouillons donnent une 404. Les variantes de casse/barre finale connues sont redirigées vers leur chemin stable en conservant la requête.
- `/remplacement` montre un état vide utile et reste noindex/hors sitemap tant qu'aucun dossier n'est publié. Il ne révèle pas les titres des brouillons.

## Maintenance et révision — SEO-24

1. Signaler dans le registre de travail la page, le fait concerné et la preuve nouvelle : source contradictoire ou retirée, erreur signalée, référence de produit modifiée, notice obtenue, test documenté ou changement d'application.
2. Retirer immédiatement la sélection publique d'un contenu dont la conclusion n'est plus soutenue en passant à review/draft ; régénérer les projections et livrer le retrait. Ne pas garder une conclusion fausse au seul motif de conserver son URL dans le sitemap.
3. Réexaminer les faits, sources et conditions. Un dossier technique doit réutiliser le dispositif métier `equivalence/cas` ; son identifiant dans un texte n'est pas une validation technique nouvelle. Vérifier le cas réel, son périmètre, sa revue et sa fraîcheur avant toute sélection publique.
4. Modifier les sections et limites, puis la date et la portée de revue. Une correction typographique ne prouve pas une nouvelle vérification physique. Un test de montage n'est mentionné que si sa preuve existe.
5. Régénérer et relire les projections ; exécuter les vérifications ci-dessous. Relever le commit, les versions backend/Worker et la recette publique après publication.

Les prix et disponibilités sont consultés sur les fiches commerciales ; les guides n'en conservent aucune copie. Les liens produit et famille doivent être revérifiés à chaque révision éditoriale. Une source contrôlée à une date donnée ne bénéficie pas d'une surveillance automatique.

## Vérifications et publication

Contrôles locaux déjà effectués : 170 tests frontend réussis, lint et build ; vérification des fragments réellement émis, des métadonnées, sources, styles et des 404 ; contrôle de l'absence des quatre brouillons dans les artefacts JS/HTML/JSON émis ; contrôle de l'absence des corps des guides dans le graphe initial JavaScript ; dix contrôles HTTP anonymes sur le Worker local avec son entrée de production, sans écriture réseau. Build backend et contrat du vrai paquet CJS réussis ; les constructions indépendantes donnent l'identité `0be4db2b80ba03a5b48d9fc4290a4b0fe5414e7d4a662a4ed103501da38c6201`. Preuves dans `output/seo-implementation/library-*` du workspace principal.

Commandes de recette reproductibles :

```text
cd Font-end
node tooling/prepareEditorial.mjs
npm test
npm run lint
npm run build
node tests/verify-editorial-build.mjs
# Serveur local : wrangler dev --local --ip 127.0.0.1 --port 8877
node tests/verify-editorial-http.mjs
```

Le contrat CI runtime exécute également le contrôle des artefacts éditoriaux avant de construire les trois profils Docker. La recette visuelle doit encore couvrir 390 et 1440 px, clavier, ancres, tableau, accès source, navigation famille/guide et hydratation sans erreur. Les tests de source et HTTP ne remplacent pas ces observations.

Le paquet de rendu change : avant publication, vérifier l'identité partagée frontend/backend, les images réelles et la compatibilité des migrations déjà en production. Livrer le backend et le Worker correspondants, puis vérifier le sitemap et les nouvelles pages publiques. Retour arrière : restaurer ensemble une version frontend/Worker et un renderer compatible, en conservant l'historique de migration déjà appliqué ; aucune suppression de données ni ancienne image incompatible avec cet historique.
