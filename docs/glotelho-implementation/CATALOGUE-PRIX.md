# Catalogue public — prix, filtres et disponibilité

Correction locale du 3 octobre 2026, suite du lot Offres/Arrivages. Aucun changement de direction E.

## Contrat

Le catalogue public filtre et classe sur le même prix unitaire que celui affiché : promotion positive, inférieure au prix détail et encore valide ; sinon prix détail. Le calcul PostgreSQL correspond au calcul serveur `cataloguePricing`, y compris l'arrondi au centime, les valeurs absentes et les valeurs numériques non exploitables. Les prix inconnus restent inconnus ; les deux tris par prix les placent après les prix connus. L'égalité de prix est départagée par identifiant pour stabiliser la pagination.

Les bornes minimum/maximum, le tri et le comptage s'appliquent avant la pagination. Seules les références de la page sont chargées dans Node, au maximum 500 comme dans le contrat existant. Une page au-delà de la sélection renvoie une liste vide et le vrai total. Le filtre « En stock » utilise le stock physique moins les réservations caisse encore actives, sans révéler leur détail.

Une transaction de lecture `RepeatableRead` assure que la sélection SQL, son total et les produits chargés proviennent du même instantané. L'heure d'application des promotions est figée par le contrôleur et réutilisée pour la projection de réponse. Une modification concurrente ne mélange donc pas un filtre ancien et un prix affiché nouveau. Il ne s'agit pas d'une réservation : la création de commande relit toujours les prix et stocks.

Les recherches texte conservent les champs existants : noms FR/EN, marque, catégorie, description et codes. Les caractères `%`, `_` et `\` d'une recherche ordinaire sont littéraux. Toutes les valeurs sont paramétrées ; les colonnes de tri viennent d'une liste fixe. L'option de recherche vendeur déjà exposée conserve ses candidats bornés ; ce mode n'est pas un comptage exhaustif du catalogue.

Le choix public/administration est déterminé par l'authentification facultative du personnel, pas par un paramètre envoyé par le client. Les clients connectés restent dans la vue publique. Le catalogue administratif conserve son tri et ses filtres sur prix détail et sa vue du stock physique. La route publique `metadata` renvoie les bornes sur prix public ; aucune utilisation de cette route n'a été trouvée dans l'administration actuelle.

Bornes négatives, non finies, illisibles ou inversées : réponse 400. Aucune migration ou modification de stock n'est nécessaire pour cette correction.

## Preuves locales

- Build backend réussi ; quatre suites ciblées, 40 tests, dont le chargement limité à la page, l'ordre SQL conservé, la page vide avec total, les bornes invalides et la séparation public/administration. Lint des trois nouveaux fichiers TypeScript réussi.
- `Back-end/scripts/verify-catalogue-pricing-local.cjs` : six scénarios de vrais services/PostgreSQL. Promotion à 2 800 FCFA avec base à 3 500, filtres cumulés, 11 pages avec égalités et prix inconnu, offre expirant exactement à l'instant de lecture, réservation et expiration, caractères spéciaux, bornes, cohérence SQL/JS sur valeurs limites et métadonnées. Une édition de prix effectuée entre sélection et chargement démontre la cohérence de l'instantané puis l'actualisation à la lecture suivante.
- Le script refuse toute base autre que `127.0.0.1:55439/newoteg_quote_acceptance_test` avant chargement de Prisma. Ce refus a été vérifié. Produits et compte de recette désactivés, ticket annulé après l'essai. La démonstration commerciale précédente est préservée.
- `Font-end/tests/verify-commercial-live.cjs` : sept contrôles sur API locale réelle. Sur mobile 390 px et ordinateur 1440 px, les commandes de filtre incluent l'offre au plafond de 2 800 et l'excluent à 2 799 ; comptage et rechargement cohérents. Le parcours fiche/panier/récapitulatif et les arrivages restent vérifiés. Aucun ordre de commande soumis par le navigateur ; trafic extérieur et mutations bloqués, excepté le devis de lecture.
- Captures `live-catalogue-price-390.png` et `live-catalogue-price-1440.png` inspectées ; résultats `catalogue-pricing-result.json` et `live-result.json` dans `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial/`. Edge indépendant utilisé après échec de connexion du navigateur intégré. Aucun téléphone physique testé.

Le défaut de tri/filtres au prix détail est fermé localement. L4 reste ouvert pour le projet et les offres réels relus par NEWOTEG ; L6–L8 restent à poursuivre. Les performances sur le catalogue de production et la recette en préproduction font partie de L8. Aucun accès Railway ou déploiement public effectué.
