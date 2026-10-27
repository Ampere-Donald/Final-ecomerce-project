# Espace boutique sur téléphone et tablette

## Portée

La même interface React sert les cinq rôles et l’APK Capacitor, qui charge `https://admin.newoteg.com`. Cette livraison ne change ni les permissions serveur ni les règles d’écriture des prix.

| Rôle | Accès rapides sur téléphone |
| --- | --- |
| Propriétaire | Accueil, Produits, Prix, À valider, Menu |
| Administrateur | Accueil, Ventes, Prix, Stock, Menu |
| Responsable | Accueil, Produits, Prix, Guide, Menu |
| Vendeur | Accueil, Vendre, Tickets, Prix, Menu |
| Caissier | Accueil, Encaisser, Caisse, Prix, Menu |

Le bouton Menu ouvre toutes les rubriques autorisées, avec recherche, défilement, fermeture et gestion du focus. Le tiroir reste utilisé jusqu’à 1023 px ; le menu latéral de bureau apparaît à partir de 1024 px. Les étapes concentrées du comptoir conservent leur retour explicite vers l’accueil.

## Changements

- En-tête compact, recherche ouvrable et états boutique repliables sur mobile.
- Hauteur de la surface visible adaptée au clavier, secours `vh` pour les anciens WebView, prise en compte des marges système.
- Le chargement ou l’erreur d’une rubrique conserve la navigation. Une URL inconnue donne un retour vers l’accueil.
- Factures, devis, employés, primes, inventaires et bons fournisseurs : tableaux présentés en fiches avec labels sur téléphone/tablette. Les documents imprimables conservent leurs tableaux.
- Actions de session de caisse et filtres de codes produits sans débordement ; actions de gestion produits affichées uniquement aux rôles autorisés.
- Choix explicite des rubriques des espaces groupés sur petit écran ; accueil dédié au responsable et invitation aux prix sur l’accueil vendeur.
- Saisie des prix avec clavier numérique, validation tactile et conservation du filtre quand une catégorie est terminée.

## Prix

Le parcours reste `GET /api/catalogue-pricing` → filtres → `PATCH /api/catalogue-pricing/:id` → retrait de la file, progression et historique. La version du produit et les contrôles atomiques du backend restent actifs. Les prix existants ne sont pas écrasés, les brouillons ne sont pas publiés, une connexion est nécessaire pour enregistrer.

## Mise à jour de l’APK/PWA

Le service worker passe du remplacement automatique au choix explicite « Actualiser l’application ». Une vérification est déclenchée au retour dans l’application et au retour du réseau. L’utilisateur peut terminer ses saisies avant de recharger. Aucune purge du stockage ou des ventes hors ligne n’est effectuée.

Pour le premier passage depuis une ancienne version, fermer complètement l’APK puis le rouvrir en ligne. L’APK qui charge l’URL de production n’a pas besoin d’être réinstallé. Les versions déjà ouvertes peuvent conserver l’ancienne page jusqu’au rechargement.

## Recette

- Chrome de la machine : parcours avec données fictives locales pour les cinq rôles, accès aux prix, recherche de rubrique, filtres, validation et retrait d’un article, progression et historique.
- Vues 320 × 568, 390 × 844, 768 × 1024 et 1440 × 1000 ; contrôles de débordement et captures.
- Factures et employés remplis ; ouverture d’un inventaire et de la session de caisse.
- Tests de navigation par rôle, filtrage de rubrique, isolation des erreurs/chargements, tableaux responsives, prix et conservation de la catégorie terminée.
- Aucun prix fictif envoyé en production. Le téléphone Android physique et son clavier logiciel ne sont pas pilotables depuis cette machine : une validation réelle dans l’APK reste distincte des vérifications Chrome et du build Android CI.
