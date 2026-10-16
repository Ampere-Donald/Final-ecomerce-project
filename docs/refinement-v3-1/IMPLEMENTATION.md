# Finition V3.1 du storefront

Brief : `983d0164-2cca-4175-9efc-829ad1c9e66c/pasted-text-1.txt`. La sélection isolée de cinq produits, publiée séparément, est conservée. Le logo, le hero, la palette, les catégories réelles et les règles d’achat ne sont pas refaits. Aucun prix, stock, offre, avis ou produit n’est créé pour cette finition.

## Changements

| Besoin | Mise en œuvre | Preuve |
| --- | --- | --- |
| Agrandir les photos | Nouveau ProductViewer chargé à l’ouverture : dialogue plein écran mobile, grand cadre desktop, zoom 150 %, vues réelles, touches gauche/droite/Escape, boutons 48 px, balayage, focus restauré et défilement de page verrouillé | Recette V3.1, cas une et plusieurs images ; photos réelles vérifiées avec le Worker local |
| Menu trop haut | Deux colonnes de familles, six recherches techniques dans la catégorie réelle, raccourcis plus courts ; chargement du module à l’ouverture | Menu réel inférieur à 420 px, clavier et drawer mobile |
| Produits trop bas | Titre et outils rapprochés, comparaison intégrée aux outils ; conseil et équivalence après les résultats | Premier résultat à environ 392 px sur desktop et 451–479 px sur mobile pour la recherche testée |
| Lisibilité | Références cartes 12 px et détail 14 px ; CTA 46 px, prix mobiles 20 px ; photos contenues dans une zone claire uniforme | Six largeurs contrôlées, captures et géométrie |
| Rayons fluides | Défilement natif par groupes, limites des flèches, touches Home/End/gauche/droite, suivi du scroll via requestAnimationFrame, remise au début lors d’un changement de collection | Recette au clavier et vrai geste tactile via Edge/CDP |
| Bannières vivantes | Nouveau BannerRotator sans bibliothèque : rotation toutes les 9 s, uniquement à l’écran ; pause interaction/survol/onglet masqué ; reprise explicite, indicateurs, commandes et balayage | Rotation, pause/reprise, inert et réduction des mouvements testés |
| Animations discrètes | Apparition en opacité des rayons, survol léger des cartes, focus recherche et ouverture de panneau ; réduction des mouvements respectée | Recette normale et prefers-reduced-motion |
| Images crédibles | Vraies images API, object-fit contain, fond homogène ; source haute définition uniquement dans la visionneuse, miniatures responsive | Aucune génération ou retouche de photo produit ; contrôle des images réellement chargées |
| Compatibilité actuelle | Conservation des corrections de recherche/hydratation de main ; état initial des bannières compatible avec le HTML préchargé | Build du rendu initial et recette de saisie avant/après hydratation réussis |

## Fichiers

- `Font-end/src/main.jsx` : charge les styles de finition.
- `Font-end/src/storefront/ProductViewer.jsx`, `product-viewer.css` : visionneuse.
- `Font-end/src/storefront/BannerRotator.jsx` : rotation éditoriale.
- `Font-end/src/storefront/refinement.css` : densité du catalogue/menu, cibles et chargement stable.
- `Font-end/src/storefront/Catalogue.jsx`, `CatalogueMenu.jsx`, `catalogueNavigation.js`, `Header.jsx` : accès au catalogue.
- `Font-end/src/storefront/Product.jsx`, `ProductPrimitives.jsx`, `cardImage.js` : galerie et tailles d’images.
- `Font-end/src/storefront/HomeMerchandising.jsx`, `ProductCarousel.jsx`, `merchandising.css`, `product-card.css` : rayons et mouvements.
- `Font-end/tests/refinement.test.mjs`, `verify-refinement-v31.cjs`, `verify-refinement-v31-live.cjs`, `verify-integration-showcase.cjs`, `measure-built-mobile.cjs` : preuves et mesures.
- `Font-end/eslint.config.js`, `.gitignore` : excluent seulement les sorties générées du serveur Wrangler local.

## Validation et captures

125 tests unitaires réussis après intégration des derniers changements de main. Lint réussi et build final réussi en 42,80 s (`index-BdUHoZdH.js`). Recette ciblée V3.1 : sept groupes réussis, dont six largeurs 360/390/412/768/1024/1440, galerie multiple et unique, zoom, fermeture, carrousel, bannières, panier avec données interceptées, menu/recherche et gestes tactiles. Recette sélection : cinq groupes réussis, conservation des cinq cartes et de leurs règles. Recette réelle avec Worker local : sept groupes réussis, zéro écriture et zéro erreur JavaScript. Recette existante d’hydratation : deux scénarios réussis, saisie et nœud de recherche conservés avant chargement du JavaScript. Les filtres de la sélection attendent désormais l’activation du navigateur, ce qui évite un clic sans effet sur le HTML initial.

Preuves locales : `C:/Users/pc/Documents/Newoteg/output/implementation-work/v31-integration/`.

| Capture demandée | Fichier |
| --- | --- |
| Accueil desktop | `showcase/home-desktop.png` |
| Bannières | `worker-actual/banner-components.png`, `worker-actual/banner-workshop.png` |
| Rayon avant/après | `showcase/shelf-before.png`, `showcase/shelf-after.png` |
| Méga-menu | `worker-actual/mega-menu.png` |
| Fiche produit | `worker-actual/product-1440.png` |
| Galerie agrandie | `worker-actual/gallery-fit-390.png`, `worker-actual/gallery-zoom-1440.png` |
| Accueil mobile | `showcase/home-mobile.png` |
| Carrousel mobile | `showcase/carousel-mobile-before.png`, `showcase/carousel-mobile-after.png` |
| Catalogue mobile | `worker-actual/catalogue-390.png` |

Les captures ont été inspectées visuellement ; les photos ne sont pas détourées artificiellement. Les tests Edge avec vue mobile/gestes CDP ne remplacent pas une recette sur un téléphone physique.

## Performance et publication

Le module du menu est désormais différé ; la visionneuse et les photos originales ne chargent qu’à l’ouverture. Les rayons conservent le chargement progressif et les limites introduites sur main, le hero garde ses images compressées et la sélection reste limitée à cinq. Aucun slider lourd ni nouvelle dépendance n’est ajouté.

Les mesures sont effectuées avec l’outil existant : Edge, viewport 390×844, CPU ×4, réseau 200 kB/s avec 150 ms de latence, cache froid, trois échantillons par route. Les métriques locales et publiques doivent être distinguées, car le transport du document est différent. Les seuils internes LCP 2,5 s / CLS 0,1 / JS 220 Kio ne sont pas des données terrain.

Le catalogue compact a initialement révélé un déplacement pendant le remplacement du chargement par les résultats. Une hauteur minimale réservée au chargement corrige ce défaut : CLS local de 0,496 à 0,0047 sur trois mesures après correction. Les mesures LCP restent au-dessus de 2,5 s sur le réseau ralenti ; ce seuil n’est pas déclaré atteint. Les mesures publiques avant/après et la version de publication seront ajoutées après contrôle effectif.
