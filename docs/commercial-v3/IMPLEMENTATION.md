# NEWOTEG V3 — refonte commerciale

## Périmètre et état

Départ : branche `codex/newoteg-evolution`, commit `622b066f` ; fichiers préexistants non suivis `Back-end/test/sandbox/` et `docs/refonte-e/` conservés. Mission : document utilisateur `22217b96-fac1-41f8-bbbf-cbd45bd7c060/pasted-text-1.txt`, 16 sections. Livraison frontend uniquement. Aucun prix, promotion, stock, commande réelle ou catégorie administrative à modifier.

Statut : implémentation en cours, publication V3 non effectuée. La précédente livraison de cinq cartes ne constitue pas cette V3.

## Audit avant refonte

Audit public en lecture seule, captures dans `C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/before/`.

- Accueil : cinq produits, puis projets/offres/arrivages ; les trois derniers sont vides actuellement. Diversité de l'inventaire peu visible.
- Recherche : formulaire opérationnel vers le catalogue. Aucune suggestion dynamique n'existe actuellement. Le header validé est conservé dans cette mission.
- Navigation : liens directs desktop et tiroir mobile (15 liens). Aucun méga-menu desktop à auditer dans le code actuel.
- Catalogue : 1 883 références au moment de l'audit ; 24 par page, filtres famille/stock/prix, tri et pagination. Vue mobile précédente en grandes cartes horizontales.
- Fiche testée : TDA 2148, référence 118057 ; caractéristiques, quantité, stock, tarif gros et ajout panier présents. Les recommandations sont de la même famille.
- Fiche sans prix : Condensateur ajustable métallique pour radio, référence 104067 ; prix absent et achat impossible. Un visuel renseigné dans l'API peut échouer et déclencher le fallback, ce qui est conservé.
- Rupture : `stockState` empêche l'achat ; accès existant aux équivalences avec `query` et `produitId`. Recette dédiée à compléter après uniformisation.
- Favoris : sauvegarde via FavoritesContext, page privée sous authentification. Comparaison : route réelle `/comparer`, trois articles d'une même famille. La tentative initiale `/comparaison` était une erreur de l'audit, pas une route attendue du site.
- Arrivages et offres : endpoints existants, aucune ligne publiée actuellement. Aucun remplacement artificiel par des promotions.
- Projets : aucune liste publiée actuellement ; accès à la bibliothèque conservé.
- Panier/checkout : à vérifier par API interceptée en local, sans commande de production.

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
- `publicCollectionCache` : uniquement données publiques de collections, TTL 30 s, maximum 50 entrées, deux requêtes simultanées et timeout 12 s. Aucun cache du checkout ou de données privées.
- Montage progressif via IntersectionObserver ; les rayons éloignés ne lancent aucune requête initiale.
- Arrivages : réception validée serveur. Offres : validation serveur et expiration locale. Prix catalogue identifié comme tarif hors offre, jamais garanti comme ancien prix historiquement pratiqué.
- Aucun asset nouvellement généré. Compositions de bannières avec les illustrations génériques déjà présentes.

## Données à compléter

Échantillon borné : jusqu'à 24 produits par catégorie, tri prix décroissant, stock positif. Liste de 77 fiches à examiner : `C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/fiches-a-completer.csv`. Cette liste n'est pas un audit exhaustif des 1 883 références. Aucun correctif automatique des données.

## Mesures avant

Outil existant `measure-built-mobile.cjs`, production GET uniquement, trois échantillons par route, 390 px, réseau 200 ko/s + 150 ms et CPU x4. Accueil LCP 5 284 / 4 516 / 4 856 ms ; catalogue 5 340 / 21 676 / 25 688 ms. CLS 0 sur six échantillons. JS encodé environ 206 ko accueil / 199 ko catalogue. Budget LCP 2,5 s déjà dépassé avant la refonte. Conditions synthétiques, pas des Core Web Vitals terrain ; variabilité CDN/API forte à documenter dans la comparaison après.

## Gates restants

- Tests unitaires des configurations, limites et promotions.
- Recette locale des six rayons, carrousels, catalogue compact/liste, langues, favoris/comparaison, fiches et panier/début checkout avec API interceptée.
- Captures six tailles (360/390/768/1024/1440/grande largeur), neuf vues obligatoires ; inspection visuelle.
- Mesures après comparables, correction des régressions significatives.
- Lint/tests/build final, commit, push main, déploiement Cloudflare existant, vérification publique et preuve de version.

Retour arrière : utiliser la version Cloudflare précédente après identification via `wrangler deployments list`, sans changer de plateforme ni réinitialiser la base. Une version n'est déclarée publiée qu'après contrôle public effectif.
