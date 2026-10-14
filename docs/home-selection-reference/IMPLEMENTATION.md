# Sélection de cinq produits sur l’accueil

Cette livraison répond uniquement au brief `96a6cfc8-0325-4af4-89cb-b67fb412ca0a/Texte collé.txt` et à son screenshot. Base conservée : main a805361b, avec ses corrections de recherche, transport HTML et images. Les autres travaux V3.1 du checkout newoteg-evolution restent séparés de cette publication.

## Code et présentation

- `Font-end/src/storefront/HomeSelection.jsx` : cinq résultats maximum ; sous-titre honnête ; grille desktop et défilement natif tablette/mobile ; clavier gauche/droite/début/fin.
- `Font-end/src/storefront/HomeProductCard.jsx` : carte indépendante, sans comparaison ni ajout au panier ; photo API responsive et non recadrée ; favoris réels ; stock, référence, prix et CTA.
- `Font-end/src/storefront/home-selection-premium.css` : classes isolées `e-selection-*`, cinq colonnes à partir de 1200 px, trois cartes visibles sur tablette, 82 % de largeur sur mobile. Fond blanc, bordure légère, zone photo uniforme, prix bleu et CTA de 44/46 px.
- `Font-end/tests/verify-selection-reference.cjs` : recette locale avec fixtures et mode réel en lecture seule ; captures et géométrie.

Les composants Card/ProductCard, ProductCarousel, OfferDetails, ComparisonAction et leurs styles partagés ne sont pas modifiés. Header, hero, catégories, équivalences, rayons, offres, arrivages, projets, Akwa et footer conservent leurs sources de main. Aucune donnée commerciale ni image produit n’est créée ou modifiée.

## Source et règles

Le filtre Tous lit `/produits/populaires` puis conserve cinq résultats uniques actifs. `findPopulaires()` du backend utilise le drapeau éditorial `isPopulaire`, avec stock vendable, trié par date d’ajout. Cela ne prouve pas un classement par ventes ; le titre demeure donc **Notre sélection** et non **Les plus demandés**.

Les filtres réutilisent les vrais IDs de catégories : Connecter → Câbles & Connectique ; Alimenter → Alimentation & Energie, Chargeurs & Power Banks, Piles & Batteries ; Mesurer & assembler → Mesure & Test, Outillage ; Réparer → Composants Électroniques. Requêtes limitées à cinq par catégorie, fusion alternée, déduplication et plafond final de cinq. Aucun mot-clé arbitraire ni catégorie inventée.

Les états de stock viennent de `stockState`. Prix absent/invalide : Prix à confirmer. Offre seulement si le contrat public validé expose un ancien prix supérieur au prix courant et une fin future ; ancien prix barré et réduction calculée à partir de ces montants. À expiration, le prix mis en cache devient à confirmer. Rupture réelle : lien `/equivalences?query=référence&produitId=id`, sans affirmation de compatibilité. Les autres CTA ouvrent la fiche produit. Favoris via FavoritesContext et aria-pressed.

## Validation locale

- `npm run lint` : réussi.
- `npm test` : 106 réussis, zéro échec.
- `npm run build -- --outDir dist-release` : réussi, 53,44 s ; bundle initial index-B3Mmr5ii.js ; HTML anonyme d’accueil généré depuis les composants partagés.
- Recette ciblée : cinq groupes réussis, dont prix inconnu, stock inconnu/faible/rupture, promotion valide, aucun faux ancien prix, favoris persistants, routes, filtres, anglais, vide/erreur/retry et comparaison/vue liste catalogue.
- Recette API réelle : trois groupes réussis ; cinq produits, filtres effectifs, grille/liste/comparaison du catalogue ; aucune écriture ni erreur JavaScript.
- Géométrie et captures contrôlées à 360, 390, 412, 768, 1000 et 1440 px : mêmes hauteurs/largeurs/actions, cinq sur une ligne desktop, trois visibles tablette, environ 1,2 mobile, pas de débordement de page.
- Captures inspectées : `C:/Users/pc/Documents/Newoteg/output/implementation-work/selection-reference/actual-local/` et `/fixture/` ; fichiers `selection-{largeur}.png`, `catalogue-1440.png`, `result.json`.

Les photos réelles et leurs fonds sont conservés. Les cinq références ne sont pas celles codées dans le screenshot : elles changent avec la sélection boutique/API. Les cas promotion et rupture sont vérifiés avec fixtures locales ; aucune promotion ou rupture n’est fabriquée en production. Aucun achat ou envoi réel n’est effectué pendant la recette.

## Publication

Publication via le Worker Cloudflare existant newoteg-client avec conservation des variables. Statut et version à confirmer après contrôle public ; cette section ne constitue pas une déclaration que toute la V3.1 est terminée.
