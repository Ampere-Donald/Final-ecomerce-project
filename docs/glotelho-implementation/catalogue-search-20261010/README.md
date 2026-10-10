# Recherche du catalogue avec accents — 10 octobre 2026

## Défaut et correction

La recherche de suggestions « câble HDMI » renvoyait zéro résultat alors que « HDMI » retrouvait des câbles. La saisie JavaScript supprimait les accents, mais les colonnes SQL gardaient ceux des noms : les deux clés n'étaient pas comparables.

Une fonction commune construit désormais la même clé de recherche pour la saisie et les champs PostgreSQL. Les suggestions et la recherche standard du catalogue traitent les accents composés/décomposés et la casse. Les noms affichés, références, prix et stocks restent inchangés. Les suffixes des références restent significatifs ; les suggestions approximatives gardent la priorité de la référence exacte. Aucun remplacement de pièce ni score de compatibilité n'est ajouté.

Le catalogue conserve sa recherche par phrase ; les suggestions conservent leur recherche par termes et approximation. Leurs nombres de résultats peuvent donc différer. Les trois variantes avec/sans accent/majuscules ont les mêmes identités ordonnées **dans chaque mode**, pas nécessairement entre les deux modes.

Les identifiants de colonnes sont limités à une liste interne, les saisies restent liées comme paramètres. Une recherche constituée uniquement de ponctuation renvoie zéro résultat. Aucune extension, migration ou écriture en base n'est nécessaire. La fonction normalize nécessite UTF8, vérifié sur la connexion utilisée ([documentation PostgreSQL](https://www.postgresql.org/docs/current/functions-string.html)).

## Vérifications avant publication

- Build Nest/Prisma réussi ; 58 suites / 420 tests backend passent.
- Lint des deux nouveaux modules et contrôle de syntaxe du script réussis ; diff sans erreur d'espace. Le gros service conserve sa dette historique : 423 erreurs/1 avertissement sur la source de départ avec fins de ligne CRLF comparables, 422/1 après. Ce n'est pas un lint global vert.
- Le script Back-end/scripts/verify-search-database.cjs exécute le véritable SQL avec des fixtures CTE dans SELECT : accents, casse, faute simple, priorité exacte, suffixe, catégorie, disponibilité, exclusion d'inactifs et absence de résultat. La session et les transactions sont en lecture seule, sans table temporaire ni donnée fictive ajoutée au catalogue.
- Six lectures du vrai service compilé : catalogue 2 résultats et suggestions 8 à la limite demandée, identiques pour câble/cable/CÂBLE HDMI. Les temps depuis le poste incluent le réseau et ne mesurent ni Railway ni LCP. Connexions fermées ; voir search-database.json.
- Navigateur Edge séparé : interface publique avec adaptateur local du service compilé, requêtes GET uniquement ; suggestions, sélection clavier vers la bonne fiche, catalogue et absence de débordement à 390/1440 pixels. Pas d'erreur JavaScript ni de mutation. Cette preuve browser.json ne prouve pas encore le backend déployé. Certains produits n'ont ni prix confirmé ni photo : leurs états restent explicites.

## Reproduction

Construire Back-end, fournir DATABASE_URL par environnement privé puis exécuter node Back-end/scripts/verify-search-database.cjs --output <dossier-absolu>. Ne pas enregistrer la connexion dans Git. Le script ne charge ni AppModule ni ses tâches planifiées. Une première exécution du harness a atteint son délai ; l'essai final terminé est la preuve retenue. Aucun client, commande ou mouvement de stock créé.

## Portée et suite

Avancée L3 du plan Glotelho : réduire les faux résultats absents lors d'une recherche usuelle. Publication et contrôle des GET publics à vérifier séparément. Le dictionnaire technique L1, les documents fabricant, les cas d'équivalence relus, l'environnement isolé Railway, les fournisseurs et la recette métier restent ouverts. Rendu catalogue SSR toujours désactivé ; le plan A–Z n'est pas terminé.


Publication vérifiée à 20:05 UTC : [PR #9](https://github.com/Ampere-Donald/Final-ecomerce-project/pull/9) fusionnée, main 7e5ec507. CI complète et les deux images catalogue réussies ; builds Workers client/admin et déploiement Railway 723117c2-0e9d-4643-879b-14d9d08f4f4e réussis. Six GET publics retournent les mêmes identités pour les variantes avec/sans accent/majuscules dans chaque mode, API/base/stockage OK. Navigateur public à 390/1440 : suggestions, clavier, bonne fiche destination, catalogue, absence de débordement/erreur/mutation. Aucun changement de donnée ou de schéma. Cette vérification ne mesure pas LCP et ne valide aucune équivalence physique. Preuves public-search.json, public-browser.json et release-status.json. L'accès OAuth Cloudflare a expiré lors de la lecture de gestion (401) ; réussite de build établie par les checks GitHub, pas de nouvelle lecture de l'abonnement ni de version par l'API de gestion.
